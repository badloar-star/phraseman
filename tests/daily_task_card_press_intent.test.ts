import { getDailyTaskCardPressIntent } from '../app/daily_task_card_press_intent';

describe('getDailyTaskCardPressIntent', () => {
  it('navigates on the first tap instead of requiring an intermediate expanded state', () => {
    expect(getDailyTaskCardPressIntent(null, 'da1')).toBe('navigate');
    expect(getDailyTaskCardPressIntent('other', 'da1')).toBe('navigate');
    expect(getDailyTaskCardPressIntent('da1', 'da1')).toBe('navigate');
  });
});
