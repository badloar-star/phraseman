import fs from 'fs';
import path from 'path';

describe('trainer weekly review placement', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/trainer.tsx'), 'utf8');

  it('places the weekly review above mistake analytics', () => {
    const reviewIndex = source.indexOf('<WeeklyReviewCard');
    const analyticsIndex = source.indexOf('Аналитика ошибок');
    expect(reviewIndex).toBeGreaterThan(-1);
    expect(analyticsIndex).toBeGreaterThan(-1);
    expect(reviewIndex).toBeLessThan(analyticsIndex);
  });
});
