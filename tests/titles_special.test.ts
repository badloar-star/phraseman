import {
  SPECIAL_TITLES,
  getEarnedSpecialTitles,
  HELPFUL_REPORTS_CONFIRMED_KEY,
} from '../constants/titles';

describe('special titles', () => {
  it('defines only the requested hard special titles', () => {
    expect(SPECIAL_TITLES.map((title) => title.id)).toEqual([
      'grammar_police',
      'iron_habit',
      'no_excuses',
      'public_legend',
    ]);
    expect(HELPFUL_REPORTS_CONFIRMED_KEY).toBe('helpful_error_reports_confirmed_v1');
  });

  it('unlocks requested special titles from auditable stats only', () => {
    const earned = getEarnedSpecialTitles({
      streak: 365,
      helpfulReportsConfirmed: 100,
      earnedAchievementIds: new Set(['streak_clean_365', 'social_likes_100']),
    }).map((title) => title.id);

    expect(earned).toEqual([
      'grammar_police',
      'iron_habit',
      'no_excuses',
      'public_legend',
    ]);
  });

  it('does not unlock near-miss hard titles', () => {
    const earned = getEarnedSpecialTitles({
      streak: 364,
      helpfulReportsConfirmed: 99,
      earnedAchievementIds: new Set(),
    });

    expect(earned).toEqual([]);
  });

  it('keeps Iron Habit unlocked after the 365-day streak achievement was earned', () => {
    const earned = getEarnedSpecialTitles({
      streak: 0,
      helpfulReportsConfirmed: 0,
      earnedAchievementIds: new Set(['streak_365']),
    }).map((title) => title.id);

    expect(earned).toEqual(['iron_habit']);
  });
});
