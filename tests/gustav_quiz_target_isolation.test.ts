import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Gustav quiz target isolation', () => {
  it.each([
    ['standalone quiz route', 'app/quizzes.tsx'],
    ['tabs quiz route', 'app/(tabs)/quizzes.tsx'],
  ])('keeps %s SRS and mistake logs scoped to the active study target', (_label, relativePath) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

    expect(source).toContain('const { studyTarget } = useStudyTarget()');
    expect(source).toMatch(/recordMistake\([\s\S]*?tokenMeta,\s*studyTarget,\s*\)/);
    expect(source).toMatch(/logMistake\([\s\S]*?'quiz',\s*'wrong_pick',\s*tokenMeta,\s*studyTarget,\s*\)/);
    expect(source).toContain('updateMultipleTaskProgress(updates, { studyTarget })');
    expect(source).toContain("('achievement_quiz_total_count', studyTarget)");
    expect(source).toContain("type: 'quiz_session_count', count: next, studyTarget");
    expect(source).toContain("type: 'quiz', level, perfect, studyTarget");
    expect(source).toContain('quizNavLevelKey(studyTarget)');
    expect(source).toContain('sourceId="quiz" studyTarget={studyTarget}');
  });

  it('keeps lifetime quiz session stats target-aware and aggregates them for the shared profile', () => {
    const tabsQuiz = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const lifetimeStats = fs.readFileSync(path.join(ROOT, 'app', 'lifetime_profile_stats.ts'), 'utf8');
    const storageKeys = fs.readFileSync(path.join(ROOT, 'app', 'target_storage_keys.ts'), 'utf8');

    expect(storageKeys).toContain('quizLifetimeCounterKey');
    expect(tabsQuiz).toContain('bumpQuizSessionCompleted(level, studyTarget)');
    expect(lifetimeStats).toContain('quizLifetimeCounterKey');
    expect(lifetimeStats).toContain('readQuizLifetimeCounterAcrossTargets');
    expect(lifetimeStats).toContain('LIFETIME_STATS_TARGETS.map(studyTarget => quizLifetimeCounterKey(rawEnglishKey, studyTarget))');
    expect(lifetimeStats).toContain('readQuizLifetimeCounterAcrossTargets(K_QUIZ_EASY)');
    expect(lifetimeStats).toContain('readQuizLifetimeCounterAcrossTargets(K_QUIZ_MEDIUM)');
    expect(lifetimeStats).toContain('readQuizLifetimeCounterAcrossTargets(K_QUIZ_HARD)');
    expect(lifetimeStats).not.toContain("AsyncStorage.getItem('quiz_hard_count')");
  });

  it('aggregates isolated English and French quiz achievement counters through shared achievements', () => {
    const achievements = fs.readFileSync(path.join(ROOT, 'app', 'achievements.ts'), 'utf8');
    const achievementsScreen = fs.readFileSync(path.join(ROOT, 'app', 'achievements_screen.tsx'), 'utf8');
    const adminTesters = fs.readFileSync(path.join(ROOT, 'app', '_admin_settings_testers.tsx'), 'utf8');
    const storageKeys = fs.readFileSync(path.join(ROOT, 'app', 'target_storage_keys.ts'), 'utf8');

    expect(storageKeys).toContain("'quiz_achievements'");
    expect(storageKeys).toContain('quizAchievementCounterKey');
    expect(storageKeys).toContain('quizPerfectLevelsTodayKey');
    expect(storageKeys).toContain('quizPerfectStreakKey');
    expect(achievements).toContain('export const bumpQuizAchievementCounter');
    expect(achievements).toContain('bumpStoredCounter(quizAchievementCounterKey(rawEnglishKey, studyTarget))');
    expect(achievements).toContain('readQuizAchievementCounterAcrossTargets');
    expect(achievements).toContain('quizPerfectLevelsTodayKey(event.studyTarget)');
    expect(achievements).toContain('quizPerfectStreakKey(event.studyTarget)');
    expect(achievements).toContain("quizAchievementCounterKey('quiz_hard_count', event.studyTarget)");
    expect(achievements).toContain("quizAchievementCounterKey('achievement_quiz_hard_perfect_count', event.studyTarget)");
    expect(achievements).toContain("readQuizAchievementCounterAcrossTargets('achievement_quiz_total_count')");
    expect(achievements).toContain("readQuizAchievementCounterAcrossTargets('quiz_hard_count')");
    expect(achievements).toContain("readQuizAchievementCounterAcrossTargets('achievement_quiz_hard_perfect_count')");
    expect(achievementsScreen).toContain('const readQuizAchievementCounterAcrossTargets = async');
    expect(achievementsScreen).toContain("readQuizAchievementCounterAcrossTargets('achievement_quiz_total_count')");
    expect(achievementsScreen).toContain("readQuizAchievementCounterAcrossTargets('quiz_hard_count')");
    expect(achievementsScreen).toContain("readQuizAchievementCounterAcrossTargets('achievement_quiz_hard_perfect_count')");
    expect(achievementsScreen).toContain('readQuizPerfectStreakAcrossTargets');
    expect(achievementsScreen).toContain('quizPerfectStreakKey(studyTarget)');
    expect(achievementsScreen).not.toContain("AsyncStorage.getItem('achievement_quiz_total_count')");
    expect(achievementsScreen).not.toContain("AsyncStorage.getItem('quiz_hard_count')");
    expect(achievementsScreen).not.toContain("AsyncStorage.getItem('achievement_quiz_hard_perfect_count')");
    expect(achievementsScreen).not.toContain("AsyncStorage.getItem('achievement_quiz_perfect_streak_v1')");
    expect(adminTesters).toContain("quizAchievementCounterKey('achievement_quiz_total_count', 'en')");
    expect(adminTesters).toContain("quizAchievementCounterKey('achievement_quiz_total_count', 'fr')");
    expect(adminTesters).toContain("quizAchievementCounterKey('quiz_hard_count', 'en')");
    expect(adminTesters).toContain("quizAchievementCounterKey('quiz_hard_count', 'fr')");
    expect(adminTesters).toContain("quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'en')");
    expect(adminTesters).toContain("quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'fr')");
  });

  it('keeps English-dev quiz mistake seeds behind the French dev seed guard', () => {
    const adminTesters = fs.readFileSync(path.join(ROOT, 'app', '_admin_settings_testers.tsx'), 'utf8');
    const seedBlockStart = adminTesters.indexOf('label="🧪 Legacy /review: засеять 15 SRS ошибок"');
    const guardIndex = adminTesters.indexOf('if (!allowEnglishDevMistakeSeed()) return;', seedBlockStart);
    const seedIndex = adminTesters.indexOf("const seed: Array<[string, number, 'lesson' | 'quiz']>", seedBlockStart);
    const quizModeIndex = adminTesters.indexOf("['pick up', 5, 'quiz']", seedBlockStart);
    const writeIndex = adminTesters.indexOf("logMistake(phrase, lessonId, mode, 'wrong_pick', {}, studyTarget)", seedBlockStart);

    expect(seedBlockStart).toBeGreaterThanOrEqual(0);
    expect(guardIndex).toBeGreaterThan(seedBlockStart);
    expect(seedIndex).toBeGreaterThan(guardIndex);
    expect(quizModeIndex).toBeGreaterThan(seedIndex);
    expect(writeIndex).toBeGreaterThan(quizModeIndex);
  });
});
