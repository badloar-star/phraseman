import {
  filterLegacyProgressForPhoneState,
  isPhoneStateCoreProgressKey,
} from '../modules/phone-state/cloud_boundary';

describe('PhoneState legacy cloud boundary', () => {
  test('classifies only migrated XP, streak, lesson, and exam progress as core', () => {
    expect(isPhoneStateCoreProgressKey('user_total_xp')).toBe(true);
    expect(isPhoneStateCoreProgressKey('streak_count')).toBe(true);
    expect(isPhoneStateCoreProgressKey('unlocked_lessons')).toBe(true);
    expect(isPhoneStateCoreProgressKey('level_exam_best_pct_v1')).toBe(true);

    expect(isPhoneStateCoreProgressKey('app_lang')).toBe(false);
    expect(isPhoneStateCoreProgressKey('vip_active')).toBe(false);
    expect(isPhoneStateCoreProgressKey('flashcards_v1')).toBe(false);
  });

  test('cutover upload omits every core field but preserves unrelated fields', () => {
    const legacyProgress = {
      user_total_xp: '999999',
      streak_count: '900',
      unlocked_lessons: '[1,2,3]',
      level_exam_best_pct_v1: '100',
      app_lang: 'fr',
      user_avatar: 'owl',
    };

    expect(filterLegacyProgressForPhoneState(legacyProgress, true)).toEqual({
      app_lang: 'fr',
      user_avatar: 'owl',
    });
    expect(filterLegacyProgressForPhoneState(legacyProgress, false)).toEqual(legacyProgress);
  });

  test('stale cloud core cannot enter a phone-authoritative restore payload', () => {
    const phoneProjection = Object.freeze({ totalXp: 420, streak: 7, unlockedLessons: ['1'] });
    const cloudProgress = {
      user_total_xp: '1',
      streak_count: '0',
      unlocked_lessons: '[]',
      app_lang: 'de',
    };

    const restorePayload = filterLegacyProgressForPhoneState(cloudProgress, true);

    expect(restorePayload).toEqual({ app_lang: 'de' });
    expect(phoneProjection).toEqual({ totalXp: 420, streak: 7, unlockedLessons: ['1'] });
  });
});
