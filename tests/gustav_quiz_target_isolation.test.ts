import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('retired Gustav quiz surface isolation', () => {
  it('keeps retired quiz routes absent', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/quizzes.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'app/(tabs)/quizzes.tsx'))).toBe(false);
  });

  it('does not aggregate retired quiz sessions into the live lifetime profile', () => {
    const lifetimeStats = read('app/lifetime_profile_stats.ts');

    expect(lifetimeStats).not.toContain('quizLifetimeCounterKey');
    expect(lifetimeStats).not.toContain('readQuizLifetimeCounterAcrossTargets');
    expect(lifetimeStats).not.toContain('bumpQuizSessionCompleted');
    expect(lifetimeStats).not.toContain('quizzesTotal');
  });

  it('preserves scoped historical storage keys for compatibility cleanup', () => {
    const storageKeys = read('app/target_storage_keys.ts');

    expect(storageKeys).toContain('quizLifetimeCounterKey');
    expect(storageKeys).toContain('quizAchievementCounterKey');
  });
});
