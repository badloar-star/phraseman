import { getDailyTaskCardPressIntent } from '../app/daily_task_card_press_intent';

describe('getDailyTaskCardPressIntent', () => {
  it('expands a closed task card before navigating', () => {
    expect(getDailyTaskCardPressIntent(null, 'da1')).toBe('expand');
    expect(getDailyTaskCardPressIntent('other', 'da1')).toBe('expand');
  });

  it('navigates only when the same task card is ready after expansion', () => {
    expect(getDailyTaskCardPressIntent('da1', 'da1')).toBe('navigate');
  });
});
