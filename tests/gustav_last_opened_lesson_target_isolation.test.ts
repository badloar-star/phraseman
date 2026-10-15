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
    const layout = readAppFile('_layout.tsx');

    expect(home).toContain('lastOpenedLessonKey');
    expect(home).toContain('const lastOpenedKey = lastOpenedLessonKey(studyTarget)');
    expect(home).toContain('AsyncStorage.multiGet([...lessonKeys, lastOpenedKey])');
    expect(home).not.toContain("AsyncStorage.getItem('last_opened_lesson')");

    expect(lessonMenu).toContain('AsyncStorage.setItem(lastOpenedLessonKey(studyTarget), String(lessonId))');
    expect(lessonMenu).not.toContain("AsyncStorage.setItem('last_opened_lesson'");

    expect(layout).toContain('const { studyTarget } = useStudyTarget();');
    // зачем: PM-210 — выключенный стартовый прогрев контента (единственное место, где
    // корень читал «последний открытый урок») удалён; корень больше не читает этот
    // ключ вовсе, а если начнёт — только через target-scoped ключ.
    expect(layout).not.toContain("AsyncStorage.getItem('last_opened_lesson')");
    expect(layout).not.toContain('prefetchLessonMenuCache(id)');
    // Изоляция — ПЕРВЫЙ аргумент studyTarget; второй (с 12.10, [LESSONS-BOOT] 2bef4202d) — метка вызывающего для журнала.
    expect(layout).toMatch(/loadLessonsTabStateFromStorage\(studyTarget(?:\s*,\s*'[a-z_]+')?\)/);
  });

  it('keeps lesson menu prefetch and cloud sync bound to the active target', () => {
    const lessonScreen = readAppFile('lesson1.tsx');
    const cloudSync = readAppFile('cloud_sync.ts');

    expect(lessonScreen).toContain('prefetchLessonMenuCache(lessonId, studyTargetRef.current)');
    expect(lessonScreen).not.toContain('prefetchLessonMenuCache(lessonId))');
    expect(cloudSync).toContain("lastOpenedLessonKey('fr')");
  });
});
