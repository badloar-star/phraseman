import fs from 'fs';
import path from 'path';

describe('trainer weekly review placement', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/trainer.tsx'), 'utf8');

  it('shows one standalone Free teaser and embeds the full review only for Plus', () => {
    const freeIndex = source.indexOf('<WeeklyReviewCard active={trainerRuntimeActive} isPremium={false} studyTarget={studyTarget} stableLayout />');
    const plusIndex = source.indexOf('<WeeklyReviewCard active={trainerRuntimeActive} isPremium={true} studyTarget={studyTarget} stableLayout embedded />');
    const analyticsIndex = source.indexOf('Аналитика ошибок');
    const tabsIndex = source.indexOf('analyticsTabs');
    expect(freeIndex).toBeGreaterThan(-1);
    expect(plusIndex).toBeGreaterThan(-1);
    expect(analyticsIndex).toBeGreaterThan(-1);
    expect(tabsIndex).toBeGreaterThan(-1);
    expect(analyticsIndex).toBeLessThan(plusIndex);
    expect(plusIndex).toBeLessThan(tabsIndex);
    expect(source).not.toContain('<StatsPremiumBlur isPremium={hasPremium} context="patterns">');
  });
});
