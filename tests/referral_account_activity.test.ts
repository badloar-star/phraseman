import { referralLocalActivityFromMap } from '../app/referral_account_activity';

describe('referral local account activity gate', () => {
  it('treats daily XP maps as existing-account activity', () => {
    expect(referralLocalActivityFromMap({
      daily_stats: JSON.stringify({
        '2026-06-30': { points: 25 },
      }),
    })).toBe(true);
  });

  it('treats daily breakdown maps as existing-account activity', () => {
    expect(referralLocalActivityFromMap({
      stats_daily_breakdown_v1: JSON.stringify({
        '2026-06-30': { quizzes_completed: 1 },
      }),
    })).toBe(true);
  });

  it('does not block a clean empty local account', () => {
    expect(referralLocalActivityFromMap({
      user_total_xp: '0',
      daily_stats: JSON.stringify({}),
      stats_daily_breakdown_v1: JSON.stringify({ '2026-06-30': { quizzes_completed: 0 } }),
      lesson1_progress: JSON.stringify(['empty', 'empty']),
    })).toBe(false);
  });
});
