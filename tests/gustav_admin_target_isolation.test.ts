import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Gustav admin target isolation', () => {
  it('keeps tester No Limits medals and reset tools on target-aware learning keys', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '_admin_settings_testers.tsx'), 'utf8');
    const reviewSource = fs.readFileSync(path.join(ROOT, 'app', '_admin_review_test.tsx'), 'utf8');
    const introPreviewSource = fs.readFileSync(path.join(ROOT, 'app', '_admin_intro_preview.tsx'), 'utf8');

    expect(source).toContain("import { useStudyTarget } from '../components/StudyTargetContext'");
    expect(source).toContain('const { studyTarget } = useStudyTarget()');
    expect(source).toContain('lessonBestScoreKey(i, studyTarget)');
    expect(source).toContain('lessonPassCountKey(i, studyTarget)');
    expect(source).toContain('lessonProgressKey(i, studyTarget)');
    expect(source).toContain("lessonSessionKey(i, 'cellIndex', studyTarget)");
    expect(source).toContain('function buildAdminResetAllDataKeys()');
    expect(source).toContain('accountLocalDataKeysForToday');
    expect(source).toContain('return Array.from(new Set([');
    expect(source).toContain("lessonProgressKey(id, 'en')");
    expect(source).toContain("lessonSessionKey(id, 'cellIndex', 'en')");
    expect(source).toContain("lessonWordsKey(id, 'en')");
    expect(source).toContain("lessonIntroShownKey(id, 'en')");
    expect(source).toContain("levelExamKey(lvl, field, 'en')");
    expect(source).toContain('const allKeys = buildAdminResetAllDataKeys()');
    expect(source).toContain('unlockedLessonsKey(studyTarget)');
    expect(source).toContain("unlockedLessonsKey('en')");
    expect(source).toContain("lastOpenedLessonKey('en')");
    expect(source).toContain("levelExamKey(lvl, 'passed', studyTarget)");
    expect(source).toContain('masteryFinishedOnceKey(i + 1, studyTarget)');
    expect(source).toContain('recomputeEarnedUnlocks(studyTarget)');
    expect(source).toContain('...FRENCH_TARGET_SYNC_KEYS');
    expect(source).toContain("keysToSet.push([`lesson${i}_score`, '5'])");
    expect(source).toContain("seedAdminTestReviewSession(studyTarget)");
    expect(source).toContain("devSeedTrainerScenario('weak', studyTarget)");
    expect(source).toContain('clearTrainerStore(studyTarget)');
    expect(source).toContain('getTopMistakePhrases(10, studyTarget)');
    expect(source).toContain("const seed: Array<[string, number, 'lesson' | 'quiz']>");
    expect(source).toContain("logMistake(phrase, lessonId, mode, 'wrong_pick', {}, studyTarget)");
    expect(source).toContain('clearMistakeLog(studyTarget)');
    expect(source).toContain('getMistakeLogDebugSnapshot(60, studyTarget)');
    expect(source).toContain("checkCoachToastNeededWithAnalytics(exactMistakes, studyTarget, lang === 'uk' ? 'uk' : 'ru')");
    expect(source).toContain('emitFrenchDevSeedBlockedToast');
    expect(source).toContain('const allowEnglishDevMistakeSeed = () =>');
    expect(source).toContain('const allowLegacyReviewModePreview = () =>');
    expect(source).toContain("if (studyTarget === 'fr')");
    expect(source).toContain('if (!allowEnglishDevMistakeSeed()) return;');
    expect(source).toContain('if (!allowLegacyReviewModePreview()) return;');
    expect(source).toContain('French legacy /review preview заблокирован');

    const noLimitsSlice = source.slice(
      source.indexOf('const toggleNoLimits = async'),
      source.indexOf('const performStripPremium = async'),
    );
    expect(noLimitsSlice).toContain("if (studyTarget === 'fr')");
    expect(noLimitsSlice.indexOf("if (studyTarget === 'fr')")).toBeLessThan(
      noLimitsSlice.indexOf('lessonBestScoreKey(i, studyTarget)'),
    );
    expect(noLimitsSlice.indexOf('emitFrenchDevSeedBlockedToast()')).toBeLessThan(
      noLimitsSlice.indexOf('lessonProgressKey(i, studyTarget)'),
    );
    expect(noLimitsSlice.indexOf("if (studyTarget === 'fr')")).toBeLessThan(
      noLimitsSlice.indexOf("keysToSet.push([`lesson${i}_score`, '5'])"),
    );

    const masterySeedSlice = source.slice(
      source.indexOf('Mastery: уроки'),
      source.indexOf('testers-quiz-e2e-results'),
    );
    expect(masterySeedSlice).toContain("if (studyTarget === 'fr')");
    expect(masterySeedSlice.indexOf("if (studyTarget === 'fr')")).toBeLessThan(
      masterySeedSlice.indexOf('masteryFinishedOnceKey(i + 1, studyTarget)'),
    );
    expect(source).not.toContain('`level_exam_${lvl}_pct`');
    expect(source).not.toContain('`level_exam_${i + 1}_pct`');
    expect(reviewSource).toContain('useStudyTarget');
    expect(reviewSource).toContain('seedAdminTestReviewSession(studyTarget)');
    expect(introPreviewSource).toContain('lessonIntroShownKey(id, studyTarget)');
    expect(introPreviewSource).not.toContain('`lesson${id}_intro_shown`');
  });
});
