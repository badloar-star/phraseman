import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'streak_stats.tsx'),
  'utf8',
);
const activeStart = source.indexOf('<BouncyWrap>');
const activeEnd = source.indexOf('{false &&', activeStart);
const activeSurface = source.slice(activeStart, activeEnd);

describe('free statistics locked cards', () => {
  it('groups every Plus analytics section at the bottom for free users', () => {
    expect(activeSurface).toContain('testID="stats-free-locked-analytics"');
    const lockedStart = activeSurface.indexOf('testID="stats-free-locked-analytics"');
    const achievements = activeSurface.indexOf('<RecentAchievementsCard');
    expect(lockedStart).toBeGreaterThan(achievements);

    const lockedSurface = activeSurface.slice(lockedStart);
    expect(lockedSurface).toContain('{weekAnalyticsBlock}');
    expect(lockedSurface).toContain('{percentilesBlock}');
    expect(source).toContain(
      'if (pItems.length === 0 && (isPremium || statsDevUnlock)) return null;',
    );
    expect(source).toContain('key="percentiles-locked"');
  });
});
