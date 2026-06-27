import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function readAppFile(...parts: string[]): string {
  return fs.readFileSync(path.join(ROOT, 'app', ...parts), 'utf8');
}

describe('Gustav last opened lesson target isolation', () => {
  it('routes last opened lesson reads and writes through target-scoped storage keys', () => {
    const home = readAppFile('(tabs)', 'home.tsx');
    const lessonMenu = readAppFile('lesson_menu.tsx');
    const dailyTasks = readAppFile('daily_tasks_screen.tsx');
    const layout = readAppFile('_layout.tsx');

    expect(home).toContain("dailyTasksAchievementAllDoneStreakKey, lastOpenedLessonKey, lessonProgressKey");
    expect(home).toContain('const lastOpenedKey = lastOpenedLessonKey(studyTarget)');
    expect(home).toContain('AsyncStorage.multiGet([...lessonKeys, lastOpenedKey])');
    expect(home).not.toContain("AsyncStorage.getItem('last_opened_lesson')");

    expect(lessonMenu).toContain('AsyncStorage.setItem(lastOpenedLessonKey(studyTarget), String(lessonId))');
    expect(lessonMenu).not.toContain("AsyncStorage.setItem('last_opened_lesson'");

    expect(dailyTasks).toContain('AsyncStorage.getItem(lastOpenedLessonKey(studyTarget))');
    expect(dailyTasks).not.toContain("AsyncStorage.getItem('last_opened_lesson')");

    expect(layout).toContain('const { studyTarget } = useStudyTarget();');
    expect(layout).toContain('AsyncStorage.getItem(lastOpenedLessonKey(studyTarget))');
    expect(layout).toContain('prefetchLessonMenuCache(id, studyTarget)');
    expect(layout).toContain('loadLessonsTabStateFromStorage(studyTarget)');
  });

  it('keeps lesson menu prefetch and cloud sync bound to the active target', () => {
    const lessonScreen = readAppFile('lesson1.tsx');
    const cloudSync = readAppFile('cloud_sync.ts');

    expect(lessonScreen).toContain('prefetchLessonMenuCache(lessonId, studyTargetRef.current)');
    expect(lessonScreen).not.toContain('prefetchLessonMenuCache(lessonId))');
    expect(cloudSync).toContain("lastOpenedLessonKey('fr')");
  });
});
