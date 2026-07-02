import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function readAppFile(...parts: string[]): string {
  // Нормализуем CRLF: параллельные сессии на Windows периодически перебивают
  // окончания строк, а многострочные toContain-контракты используют \n.
  return fs.readFileSync(path.join(ROOT, 'app', ...parts), 'utf8').replace(/\r\n/g, '\n');
}

describe('Gustav lesson runtime target isolation', () => {
  it('stores one-time grammar hints through study-target scoped keys', () => {
    const lesson = readAppFile('lesson1.tsx');
    const cloudSync = readAppFile('cloud_sync.ts');

    expect(lesson).toContain('grammarHintSeenKey');
    expect(lesson).toContain('const seenKey = grammarHintSeenKey(hint.key, studyTarget)');
    expect(lesson).toContain('AsyncStorage.getItem(seenKey)');
    expect(lesson).toContain("AsyncStorage.setItem(seenKey, '1')");
    expect(lesson).not.toContain('AsyncStorage.getItem(hint.key)');
    expect(lesson).not.toContain('AsyncStorage.setItem(hint.key');

    // cloud_sync отрефакторен: ключи «подсказка показана» строятся map-ом по всем
    // study target-ам; контракт — оба таргета обязаны присутствовать в списке.
    expect(cloudSync).toContain("const SYNC_STUDY_TARGETS = ['en', 'fr'] as const");
    expect(cloudSync).toContain('GRAMMAR_HINT_STORAGE_IDS.map((id) => grammarHintSeenKey(id, target))');
  });

  it('stores the daily 50/50 lesson helper counter per study target', () => {
    const lesson = readAppFile('lesson1.tsx');
    const cloudSync = readAppFile('cloud_sync.ts');

    expect(lesson).toContain('fiftyFiftyUsageKey');
    expect(lesson).toContain("fiftyFiftyUsageKey(new Date().toISOString().slice(0, 10), studyTargetRef.current)");
    expect(lesson).not.toContain('`fifty_fifty_${new Date().toISOString().slice(0, 10)}`');

    // Дневные ключи 50/50 собираются в dailyLessonHelperKeysForToday(todayKey = getTodayKey()).
    expect(cloudSync).toContain('function dailyLessonHelperKeysForToday(todayKey: string = getTodayKey())');
    expect(cloudSync).toContain("fiftyFiftyUsageKey(todayKey, 'en')");
    expect(cloudSync).toContain("fiftyFiftyUsageKey(todayKey, 'fr')");
  });

  it('stores bonus lesson hints per study target', () => {
    const lesson = readAppFile('lesson1.tsx');
    const cloudSync = readAppFile('cloud_sync.ts');

    expect(lesson).toContain('getBonusHintsToday(studyTargetRef.current)');
    expect(lesson).not.toContain('getBonusHintsToday()');

    expect(cloudSync).toContain("lessonBonusHintsKey(todayKey, 'en')");
    expect(cloudSync).toContain("lessonBonusHintsKey(todayKey, 'fr')");
  });
});
