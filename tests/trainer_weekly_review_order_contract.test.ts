import fs from 'fs';
import path from 'path';

describe('practice hall progressive disclosure', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/trainer.tsx'), 'utf8');

  it('keeps detailed analytics and the weekly review behind the results disclosure', () => {
    const freeIndex = source.indexOf('<WeeklyReviewCard active={trainerRuntimeActive} isPremium={false} studyTarget={studyTarget} stableLayout />');
    const plusIndex = source.indexOf('<WeeklyReviewCard active={trainerRuntimeActive} isPremium={true} studyTarget={studyTarget} stableLayout embedded />');
    const hallTitleIndex = source.indexOf("ru: 'Зал практики'");
    const resultsIndex = source.indexOf("ru: 'Твои результаты'");
    const analyticsIndex = source.indexOf('Аналитика ошибок');
    const tabsIndex = source.indexOf('analyticsTabs');
    expect(freeIndex).toBeGreaterThan(-1);
    expect(plusIndex).toBeGreaterThan(-1);
    expect(hallTitleIndex).toBeGreaterThan(-1);
    expect(resultsIndex).toBeGreaterThan(-1);
    expect(analyticsIndex).toBeGreaterThan(-1);
    expect(tabsIndex).toBeGreaterThan(-1);
    expect(resultsIndex).toBeLessThan(analyticsIndex);
    expect(analyticsIndex).toBeLessThan(plusIndex);
    expect(plusIndex).toBeLessThan(tabsIndex);
    expect(source).toContain('detailsOpen && hasPremium');
    expect(source).toContain('practiceHallDuration');
    expect(source).toContain('personalTrainings.map');
    expect(source).not.toContain('PRACTICE_OPTIONS.map');
    expect(source).not.toContain('<StatsPremiumBlur isPremium={hasPremium} context="patterns">');
  });
});
