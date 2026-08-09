import fs from 'fs';
import path from 'path';

import { storedProgressFlagIsTrue } from '../app/target_storage_keys';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('level exam progress flag compatibility', () => {
  it.each([true, 1, '1', 'true', 'TRUE', ' yes '])('accepts the passed representation %p', (value) => {
    expect(storedProgressFlagIsTrue(value)).toBe(true);
  });

  it.each([false, 0, '0', 'false', '', null, undefined, 'no'])('rejects the non-passed representation %p', (value) => {
    expect(storedProgressFlagIsTrue(value)).toBe(false);
  });

  it('keeps every runtime exam/unlock reader on the compatible parser', () => {
    const lessonsState = read('app/lessons_tab_state.ts');
    const lockSystem = read('app/lesson_lock_system.ts');
    const examV2 = read('components/level-exam/LevelExamV2.tsx');
    const cloudSync = read('app/cloud_sync.ts');
    const progressEvents = read('functions/src/progress_events.ts');

    expect(lessonsState).toContain('passed: storedProgressFlagIsTrue(passedRaw)');
    expect(lockSystem).toContain("storedProgressFlagIsTrue(map[levelExamKey('B1', 'passed', studyTarget)])");
    expect(lockSystem).toContain('examPairs.every(([, v]) => storedProgressFlagIsTrue(v))');
    expect(examV2).toContain('const firstPass = !storedProgressFlagIsTrue(previousPassed)');
    expect(examV2).not.toContain("previousPassed !== '1'");
    expect(cloudSync).toContain("return value === true || s === 'true' || s === '1' || s === 'yes'");
    expect(progressEvents).toContain("return s === 'true' || s === '1' || s === 'yes'");
  });

  it('keeps both local exam routes and cloud restore monotonic', () => {
    const examV2 = read('components/level-exam/LevelExamV2.tsx');
    const legacyExam = read('app/level_exam.tsx');
    const cloudSync = read('app/cloud_sync.ts');

    expect(examV2).toContain("scored.passed ? '1' : '0'");
    expect(legacyExam).toContain('const persistedPassed = storedProgressFlagIsTrue(previousPassedRaw) || passed');
    expect(legacyExam).toContain('const persistedPct = Math.max(Number.isFinite(previousPct) ? previousPct : 0, pct)');
    expect(legacyExam).toContain("persistedPassed ? '1' : '0'");
    expect(legacyExam).not.toContain("levelExamKey(lvl, 'passed', studyTarget), passed ? '1' : '0'");
    expect(cloudSync).toContain("parseProgressBool(cloudValue) || parseProgressBool(localValue) ? 'true' : 'false'");
  });
});
