import fs from 'fs';
import path from 'path';

function readAppFile(...parts: string[]): string {
  return fs.readFileSync(path.join(process.cwd(), 'app', ...parts), 'utf8');
}

describe('legacy free lesson cap wiring', () => {
  const lessonsSource = readAppFile('(tabs)', 'lessons.tsx');
  const runtimeGateSource = readAppFile('lesson_premium_gate.ts');
  const lessonMenuSource = readAppFile('lesson_menu.tsx');
  const lessonCompleteSource = readAppFile('lesson_complete.tsx');
  const levelExamSource = readAppFile('level_exam.tsx');
  const lockSystemSource = readAppFile('lesson_lock_system.ts');

  test('hydrates and projects the cap through every lessons-tab entitlement decision', () => {
    expect(lessonsSource).toContain('const [legacyFreeLessonCap, setLegacyFreeLessonCap]');
    expect(lessonsSource).toContain('setLegacyFreeLessonCap(snapshot.legacyFreeLessonCap)');
    expect(lessonsSource).toContain('legacyFreeLessonCap: effectiveLegacyFreeLessonCap');
    expect(lessonsSource).toContain('requiresPremiumForLesson(to, effectiveLegacyFreeLessonCap)');
    expect(lessonsSource).toContain('requiresPremiumForLesson(num, effectiveLegacyFreeLessonCap)');
    expect(lessonsSource).toContain('lessonPaywallContext(lessonNum, effectiveLegacyFreeLessonCap)');
  });

  // D122 (da298f561): потолок прежнего Free читается в одном месте —
  // isLessonUnlockedByEarnedProgress (lesson_lock_system) из сохранённого ключа миграции.
  test('the shared earned-progress gate opens grandfathered lessons from the persisted cap', () => {
    expect(lockSystemSource).toContain('legacyFreeLessonCapKey(studyTarget)');
    expect(lockSystemSource).toContain('isLegacyLessonGrandfatheredOpen(lessonId, legacyCap)');
  });

  test('direct lesson routes and the lesson menu consult earned progress before premium', () => {
    for (const source of [runtimeGateSource, lessonMenuSource]) {
      const earnedAt = source.indexOf('isLessonUnlockedByEarnedProgress(lessonId, studyTarget)');
      const premiumAt = source.indexOf('getVerifiedPremiumStatus()', earnedAt);
      expect(earnedAt).toBeGreaterThan(-1);
      expect(premiumAt).toBeGreaterThan(earnedAt);
    }
  });

  test('lesson completion uses the same immutable cap', () => {
    expect(lessonCompleteSource).toContain('readLegacyFreeLessonCap(studyTarget)');
    expect(lessonCompleteSource).toContain(
      'requiresPremiumForLesson(next, legacyFreeLessonCap)',
    );
  });

  test('A1 exam entitlement recognizes a frozen cap through lesson 8', () => {
    expect(levelExamSource).toContain('readLegacyFreeLessonCap(studyTarget)');
    expect(levelExamSource).toContain('getLastLessonForLevel(examLevel)');
    expect(levelExamSource).toContain(
      'requiresPremiumForLesson(lastLessonForLevel, legacyFreeLessonCap)',
    );
  });
});
