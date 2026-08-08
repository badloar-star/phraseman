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
    expect(source.match(/restoreFromCloudWithRecoveryDetails\(coldExamBestPctRestoreOptions\)/g)).toHaveLength(1);
    expect(source).toContain('restore: restoreCloudForBoot');
    expect(source).toContain('return restoreCloudForBoot()');
    expect(source).toContain("AppState.currentState === 'active'");
    expect(source).toContain('isExamBestPctColdRestoreTabSafe()');
  });

  test('tab layout closes the gate before activation and protects stale owner pixels', () => {
    // зачем 2026-08-02: таб «Уроки» убран — LessonsPaneBoundary (privacy-крышка
    // удерживаемой панели) ушла вместе с ним. Push-маршрут /lessons_list гейтится
    // честным фокусом, а против чужих пикселей после смены аккаунта сессионный
    // кэш списка уроков штампуется поколением аккаунта и сбрасывается при смене.
    const source = read('app/(tabs)/_layout.tsx');
    expect(source).toContain("setExamBestPctTabActivity(idx === 0 ? 'safe_home' : 'unsafe')");
    expect(source).not.toContain('<LessonsPaneBoundary');

    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('let lessonsUiSessionCacheGeneration = -1;');
    expect(lessons).toContain('if (generation !== lessonsUiSessionCacheGeneration) {');
    expect(lessons).toContain('lessonsUiSessionCacheByTarget = {};');
    expect(lessons).toContain('writeLessonsUiSessionCache(lessonCacheTarget, snapshot);');
  });
});
