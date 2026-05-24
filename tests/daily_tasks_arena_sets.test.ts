import { getDailySetsArenaPolicyErrors } from '../app/daily_tasks';

describe('DAILY_SETS arena policy', () => {
  it('has exactly one arena-type task per calendar day slot for free and premium', () => {
    const errs = getDailySetsArenaPolicyErrors();
    expect(errs).toEqual([]);
  });
});
