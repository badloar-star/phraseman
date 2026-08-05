import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('runtime failure-state contracts', () => {
  test('achievement claim updates success UI only after a confirmed claim', () => {
    const source = read('app/achievements_screen.tsx');
    const claimIndex = source.indexOf('claimAchievementShardReward(achievement.id)');
    const confirmedIndex = source.indexOf('if (!claimed) return;', claimIndex);
    const uiIndex = source.indexOf('onShardClaimed(achievement.id);', claimIndex);
    expect(claimIndex).toBeGreaterThanOrEqual(0);
    expect(confirmedIndex).toBeGreaterThan(claimIndex);
    expect(uiIndex).toBeGreaterThan(confirmedIndex);
  });

  test('review load rejection leaves the skeleton and exposes retry', () => {
    const source = read('app/review.tsx');
    expect(source).toContain('setLoadError(true);');
    expect(source).toContain('testID="review-load-error"');
    expect(source).toContain('testID="review-load-retry"');
    expect(source).toContain('setLoadAttempt((value) => value + 1)');
  });

  test('personal-plan completion is not marked successful after a swallowed save error', () => {
    const source = read('app/personal_plan_complete.tsx');
    expect(source).toContain("if (state.status === 'active') await completePersonalPlan();");
    expect(source).not.toContain('completePersonalPlan().catch(() => {})');
    expect(source).toContain('testID="personal-plan-complete-load-error"');
    expect(source).toContain('testID="personal-plan-complete-load-retry"');
  });

  test('active study target registry no longer exposes French', () => {
    const production = read('app/study_target.ts');
    const dev = read('app/study_target_lang_dev.ts');
    expect(production).toContain("export type StudyTarget = 'en';");
    expect(production).not.toContain("| 'fr'");
    expect(dev).toContain("DEV_STUDY_TARGET_LANGS = ['en', 'es']");
    expect(dev).not.toContain("fr: 'Французский'");
  });
});
