import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function readAppFile(...parts: string[]): string {
  return fs.readFileSync(path.join(ROOT, 'app', ...parts), 'utf8');
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

    expect(cloudSync).toContain('grammarHintSeenKey(id, \'en\')');
    expect(cloudSync).toContain('grammarHintSeenKey(id, \'fr\')');
  });

  it('stores the daily 50/50 lesson helper counter per study target', () => {
    const lesson = readAppFile('lesson1.tsx');
    const cloudSync = readAppFile('cloud_sync.ts');

    expect(lesson).toContain('fiftyFiftyUsageKey');
    expect(lesson).toContain("fiftyFiftyUsageKey(new Date().toISOString().slice(0, 10), studyTargetRef.current)");
    expect(lesson).not.toContain('`fifty_fifty_${new Date().toISOString().slice(0, 10)}`');

    expect(cloudSync).toContain("fiftyFiftyUsageKey(getTodayKey(), 'en')");
    expect(cloudSync).toContain("fiftyFiftyUsageKey(getTodayKey(), 'fr')");
  });

  it('stores bonus lesson hints per study target', () => {
    const lesson = readAppFile('lesson1.tsx');
    const cloudSync = readAppFile('cloud_sync.ts');

    expect(lesson).toContain('getBonusHintsToday(studyTargetRef.current)');
    expect(lesson).not.toContain('getBonusHintsToday()');

    expect(cloudSync).toContain("lessonBonusHintsKey(getTodayKey(), 'en')");
    expect(cloudSync).toContain("lessonBonusHintsKey(getTodayKey(), 'fr')");
  });
});
