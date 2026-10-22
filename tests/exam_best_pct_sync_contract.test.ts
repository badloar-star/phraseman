import fs from 'fs';
import path from 'path';

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

describe('zero-cost exam best-pct sync wiring', () => {
  test('cold restore reuses the existing document and keeps default restore legacy', () => {
    const source = read('app/cloud_sync.ts');
    expect(source).toContain('type CloudRestoreOptions =');
    expect(source).toContain('tryPublishExamBestPctOverlay');
    expect(source).toContain('export async function restoreFromCloudDetailed(options: CloudRestoreOptions = {})');
    expect(source).toContain('root.progressServerAuthoritative === true');
    expect(source).not.toContain("AsyncStorage.setItem('exam_best_pct_overlay");
  });

  test('lessons applies the owner- and target-scoped overlay only at medal render', () => {
    const source = read('app/(tabs)/lessons.tsx');
    expect(source).toContain("peekCurrentExamBestPct(studyTarget, examLevel)");
    expect(source).toContain('Math.max(currentTargetStateBestPct, overlayBestPct)');
    expect(source).toContain('examBestPctTargetRef.current === lessonCacheTarget');
    expect(source).not.toContain('setExamBestPcts({ ...examBestPcts');
  });

  test('boot coordinators pass only synchronous safety guards', () => {
    const source = read('app/_layout.tsx');
    // зачем (правило владельца 18.10, a62796ede: вход и выход без ошибок): кроме холодного восстановления есть ровно один
    // тихий повтор в фоне (5 с, 30 с, 2 мин) — он берёт те же защитные опции, а не свои.
    expect(source.match(/restoreFromCloudWithRecoveryDetails\(coldExamBestPctRestoreOptions\)/g)).toHaveLength(2);
    expect(source).toContain('attempt: () => restoreFromCloudWithRecoveryDetails(coldExamBestPctRestoreOptions),');
    expect(source).toContain('restore: restoreCloudForBoot');
    // зачем (10.10): после снятия App Check (4a1c787b4) обёртка стала стрелкой без тела — тот же вызов.
    expect(source).toContain('restore: () => restoreCloudForBoot()');
    expect(source).toContain("AppState.currentState === 'active'");
    expect(source).toContain('isExamBestPctColdRestoreTabSafe()');
  });

  test('tab layout closes the gate before activation and protects stale owner pixels', () => {
    const source = read('app/(tabs)/_layout.tsx');
    expect(source).toContain("setExamBestPctTabActivity(idx === 0 ? 'safe_home' : 'unsafe')");
    expect(source).toContain('<LessonsPaneBoundary');
    expect(source).toContain('captureAccountGeneration()');
    expect(source).toContain('subscribeAccountGeneration');
    expect(source).toMatch(/key=\{`lessons-\$\{privacy\.epoch\}`\}/);
    expect(source).toContain("presentation: 'tab'");

    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('let lessonsUiSessionCacheGeneration = -1;');
    expect(lessons).toContain('if (generation !== lessonsUiSessionCacheGeneration) {');
    expect(lessons).toContain('lessonsUiSessionCacheByTarget = {};');
    expect(lessons).toContain('writeLessonsUiSessionCache(lessonCacheTarget, snapshot);');
  });
});
