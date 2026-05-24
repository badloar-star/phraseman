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
} from '../app/daily_tasks';

const repoRoot = path.join(__dirname, '..');

const byId = (id: string): DailyTask => {
  const task = ALL_TASKS.find((candidate) => candidate.id === id);
  if (!task) throw new Error(`Missing daily task fixture: ${id}`);
  return task;
};

describe('Gustav French daily task target filter', () => {
  it('blocks English-only daily task types for French without changing English or Spanish-dev behavior', () => {
    const sample = [
      byId('qe1'),
      byId('qm1'),
      byId('qh1'),
      byId('qp1'),
      byId('qhp1'),
      byId('qs1'),
      byId('vl1'),
      byId('dpr1'),
      byId('dps1'),
      byId('dc1'),
    ];
    const sourceGated = [
      byId('da1'),
      byId('ta1'),
      byId('cs1'),
      byId('lnm1'),
      byId('wl1'),
      byId('ot1'),
      byId('dl1'),
      byId('lc1'),
      byId('ms1'),
      byId('evs1'),
      byId('es1'),
      byId('fs1'),
      byId('rs1'),
      byId('ra1'),
      byId('rp1'),
      byId('tw1'),
      byId('tp1'),
      byId('tar1'),
    ];

    expect([...sample, ...sourceGated].map((task) => task.type)).toEqual(
      expect.arrayContaining([...FRENCH_UNAVAILABLE_DAILY_TASK_TYPES]),
    );
    expect(sourceGated.map((task) => task.type)).toEqual(expect.arrayContaining([
      ...FRENCH_LESSON_CONTENT_DAILY_TASK_TYPES,
      ...FRENCH_THEORY_DAILY_TASK_TYPES,
    ]));
    expect([...sample, ...sourceGated].every((task) => dailyTaskAvailableForStudyTarget(task, 'en'))).toBe(true);
    expect([...sample, ...sourceGated].every((task) => dailyTaskAvailableForStudyTarget(task, 'es'))).toBe(true);
    expect([...sample, ...sourceGated].every((task) => !dailyTaskAvailableForStudyTarget(task, 'fr'))).toBe(true);
    expect(dailyTaskAvailableForStudyTarget(byId('dp1'), 'fr')).toBe(true);
    expect(dailyTaskAvailableForStudyTarget(byId('dw1'), 'fr')).toBe(true);
    expect(dailyTaskAvailableForStudyTarget(byId('inv1'), 'fr')).toBe(true);
  });

  it('keeps the French daily task list full while replacing unavailable learning surfaces', () => {
    const original = [byId('qe1'), byId('dc1'), byId('vl1'), byId('dpr1'), byId('da1')];
    const filtered = filterDailyTasksForStudyTarget(original, 'fr');

    expect(filtered).toHaveLength(original.length);
    expect(filtered.every((task) => dailyTaskAvailableForStudyTarget(task, 'fr'))).toBe(true);
    expect(new Set(filtered.map((task) => task.id)).size).toBe(filtered.length);
    expect(filtered.map((task) => task.type)).not.toEqual(expect.arrayContaining([
      ...FRENCH_LESSON_CONTENT_DAILY_TASK_TYPES,
      ...FRENCH_THEORY_DAILY_TASK_TYPES,
      'quiz_easy',
      'diagnostic_complete',
      'words_learned',
      'verb_learned',
      'daily_phrase_read',
    ]));
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
    expect(home).toContain("item.key !== 'quizzes'");
    expect(home).toContain('visibleActivityQuickItems');
    expect(home).toContain("item.key !== 'attest'");
    expect(home).toContain("studyTarget !== 'fr' && <DailyPhraseCard />");

    expect(dailyScreen).toContain('useStudyTarget');
    expect(dailyScreen).toContain('getTodayTasksSafe(studyTarget)');
    expect(dailyScreen).toContain('loadTodayProgress(list, studyTarget)');
    expect(dailyScreen).toContain('getDailyRerollsLeftToday(studyTarget)');
    expect(dailyScreen).toContain('const backupTaskList = filterDailyTasksForStudyTarget(getTodayTasks(), studyTarget)');
    expect(dailyScreen).not.toContain(['fall', 'back'].join(''));
    expect(dailyScreen).toContain('rerollDailyTask(target.id, studyTarget)');
    expect(dailyScreen).toContain('dailyTaskAvailableForStudyTarget(task, studyTarget)');
    expect(dailyScreen).toContain('primeLessonScreenFromStorage(lessonId, studyTarget)');
    expect(dailyScreen).toContain('quizNavLevelKey(studyTarget)');

    expect(layout).toContain('primeAllLessonsFromStorageOnAppLaunch(studyTarget)');

    expect(notifications).toContain('getStoredStudyTarget(lang)');
    expect(notifications).toContain("if (studyTarget === 'fr')");
    expect(notifications).toContain("cancelScheduledNotificationsByType(N, ['phrase_of_day'])");
    expect(notifications).toContain("AsyncStorage.removeItem('phrase_notif_scheduled')");

    expect(dailyPhraseCard).toContain("import { useStudyTarget } from './StudyTargetContext'");
    expect(dailyPhraseCard).toContain('getTodayPhraseSyncForTarget(studyTarget)');
    expect(dailyPhraseCard).toContain('getTodayPhraseForTarget(studyTarget)');
    expect(dailyPhraseCard).toContain('subscribeTodayPhraseForTarget(p => { if (p) setPhrase(p); }, studyTarget)');
    expect(dailyPhraseCard.indexOf("if (studyTarget === 'fr')")).toBeLessThan(
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
    expect(dailyTasks).toContain('dailyTasksAdminOverrideKey(studyTarget)');
    expect(dailyTasks).toContain('loadRerollStateRaw(studyTarget)');
    expect(dailyTasks).toContain('loadAdminTaskOverride(studyTarget)');
    expect(dailyTasks).toContain('filterDailyTasksForStudyTarget(requestedTasks, studyTarget)');
    expect(dailyTasks).toContain('saveTodayProgress(tasks.map((task) => makeAdminProgressRow(task, mode)), studyTarget)');
    expect(dailyTasks).toContain('studyTarget?: RuntimeStudyTarget');

    const adminSettings = fs.readFileSync(path.join(repoRoot, 'app', '_admin_settings_testers.tsx'), 'utf8');
    expect(adminSettings).toContain('seedDailyTasksAdminPack(pack.taskIds, dailyTaskSeedMode, studyTarget)');
    expect(adminSettings).toContain('clearDailyTasksAdminOverride(studyTarget)');

    expect(dailyScreen).toContain('{ tasksForClaim, studyTarget }');
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
