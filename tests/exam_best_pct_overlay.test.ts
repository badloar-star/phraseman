import {
  __resetExamBestPctOverlayForTests,
  extractExamBestPctOverlay,
  isExamBestPctColdRestoreTabSafe,
  peekCurrentExamBestPct,
  publishExamBestPctOverlay,
  setExamBestPctTabActivity,
} from '../app/exam_best_pct_overlay';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';

describe('session-only exam best-pct overlay', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    __resetExamBestPctOverlayForTests();
  });

  test('extracts only the eight allowlisted en/fr best_pct values', () => {
    expect(extractExamBestPctOverlay({
      level_exam_A1_best_pct: 91,
      level_exam_A2_best_pct: '72',
      level_exam_B1_best_pct: 101,
      level_exam_B2_best_pct: '72.5',
      'level_exams_v2::fr::level_exam_A1_best_pct': '63',
      'level_exams_v2::fr::level_exam_A2_best_pct': true,
      level_exam_A1_best_score: 5,
      level_exam_A1_passed: '1',
      unlocked_lessons: '[1,2]',
    })).toEqual({
      'en|A1': 91,
      'en|A2': 72,
      'fr|A1': 63,
    });
  });

  test('keeps values owner-scoped and never exposes them during a transition', () => {
    beginAccountGeneration('account-a');
    publishExamBestPctOverlay('account-a', { 'en|A1': 88 });
    expect(peekCurrentExamBestPct('en', 'A1')).toBe(88);

    invalidateAccountGeneration();
    expect(peekCurrentExamBestPct('en', 'A1')).toBe(0);

    beginAccountGeneration('account-b');
    expect(peekCurrentExamBestPct('en', 'A1')).toBe(0);
    publishExamBestPctOverlay('account-b', { 'en|A1': 54 });
    expect(peekCurrentExamBestPct('en', 'A1')).toBe(54);
  });

  test('merges repeated same-owner publication monotonically without I/O', () => {
    beginAccountGeneration('account-a');
    publishExamBestPctOverlay('account-a', { 'en|A1': 88, 'fr|B2': 41 });
    publishExamBestPctOverlay('account-a', { 'en|A1': 70, 'en|A2': 60 });
    expect(peekCurrentExamBestPct('en', 'A1')).toBe(88);
    expect(peekCurrentExamBestPct('en', 'A2')).toBe(60);
    expect(peekCurrentExamBestPct('fr', 'B2')).toBe(41);
  });

  test('tab gate is closed by default and safe only on settled home', () => {
    expect(isExamBestPctColdRestoreTabSafe()).toBe(false);
    setExamBestPctTabActivity('unsafe');
    expect(isExamBestPctColdRestoreTabSafe()).toBe(false);
    setExamBestPctTabActivity('safe_home');
    expect(isExamBestPctColdRestoreTabSafe()).toBe(true);
    setExamBestPctTabActivity('unknown');
    expect(isExamBestPctColdRestoreTabSafe()).toBe(false);
  });
});
