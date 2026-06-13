import fs from 'fs';
import path from 'path';

describe('trainer weekly review placement', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/trainer.tsx'), 'utf8');

  it('embeds the weekly review inside mistake analytics for premium users', () => {
    const reviewIndex = source.indexOf('<WeeklyReviewCard isPremium={hasPremium} studyTarget={studyTarget} stableLayout embedded />');
    const analyticsIndex = source.indexOf('Аналитика ошибок');
    const tabsIndex = source.indexOf('analyticsTabs');
    expect(reviewIndex).toBeGreaterThan(-1);
    expect(analyticsIndex).toBeGreaterThan(-1);
    expect(tabsIndex).toBeGreaterThan(-1);
    expect(analyticsIndex).toBeLessThan(reviewIndex);
    expect(reviewIndex).toBeLessThan(tabsIndex);
  });
});
