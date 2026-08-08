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

  test('hydrates and projects the cap through every lessons-tab entitlement decision', () => {
    expect(lessonsSource).toContain('const [legacyFreeLessonCap, setLegacyFreeLessonCap]');
    expect(lessonsSource).toContain('setLegacyFreeLessonCap(snapshot.legacyFreeLessonCap)');
    expect(lessonsSource).toContain('legacyFreeLessonCap: effectiveLegacyFreeLessonCap');
    expect(lessonsSource).toContain('requiresPremiumForLesson(to, effectiveLegacyFreeLessonCap)');
    expect(lessonsSource).toContain('requiresPremiumForLesson(num, effectiveLegacyFreeLessonCap)');
    expect(lessonsSource).toContain('lessonPaywallContext(lessonNum, effectiveLegacyFreeLessonCap)');
  });

  test('direct lesson routes read the target cap before premium and progress gates', () => {
    const readCapAt = runtimeGateSource.indexOf('readLegacyFreeLessonCap(studyTarget)');
    const premiumAt = runtimeGateSource.indexOf('getVerifiedPremiumStatus()', readCapAt);
    expect(readCapAt).toBeGreaterThan(-1);
    expect(runtimeGateSource).toContain(
      'isLegacyLessonGrandfatheredOpen(lessonId, legacyFreeLessonCap)',
    );
    expect(premiumAt).toBeGreaterThan(readCapAt);
    expect(runtimeGateSource).toContain(
      'requiresPremiumForLesson(lessonId, legacyFreeLessonCap)',
    );
  });

  test('lesson menu and completion use the same immutable cap', () => {
    expect(lessonMenuSource).toContain('readLegacyFreeLessonCap(studyTarget)');
    expect(lessonMenuSource).toContain(
      'isLegacyLessonGrandfatheredOpen(lessonId, legacyFreeLessonCap)',
    );
    expect(lessonMenuSource).toContain(
      'requiresPremiumForLesson(lessonId, legacyFreeLessonCap)',
    );
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
