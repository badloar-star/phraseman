import fs from 'fs';
import path from 'path';

// 04.10 (results.html «Серия и результаты», решение координатора (б)): экран собран из героя серии
// (StreakHeroCard), «Вашей недели», строки ритма, последних достижений и закрытой аналитики Plus
// (WeekAnalyticsCard и сравнение). Прежний PrimaryAnalyticsCard разделён, ставка на серию удалена
// в 2.0 (снимок efe19ae9d), значки достижений рисует общий AchievementArt.
const ROOT = path.join(__dirname, '..');
const statsSource = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
const activeStart = statsSource.indexOf('<BouncyWrap>');
const activeEnd = statsSource.indexOf('{false &&', activeStart);
const activeSurface = statsSource.slice(activeStart, activeEnd);
const recentStart = statsSource.indexOf('function RecentAchievementsCard');
const recentEnd = statsSource.indexOf('export default function StreakStats', recentStart);
const recentSurface = statsSource.slice(recentStart, recentEnd);
const heroStart = statsSource.indexOf('function StreakHeroCard');
const heroEnd = statsSource.indexOf('function WeekAnalyticsCard', heroStart);
const heroSurface = statsSource.slice(heroStart, heroEnd);
const weekStart = statsSource.indexOf('function WeekAnalyticsCard');
const weekEnd = statsSource.indexOf('function AllMetricsFoldCard', weekStart);
const weekSurface = statsSource.slice(weekStart, weekEnd);

describe('statistics surface composition', () => {
  it('keeps the results surface in the approved order, focused on progress', () => {
    const orderedMarkers = [
      '<StreakHeroCard',
      'testID="stats-week-spark"',
      'testID="stats-rhythm-row"',
      '<RecentAchievementsCard',
      'testID="stats-free-locked-analytics"',
    ];

    let cursor = -1;
    for (const marker of orderedMarkers) {
      const next = activeSurface.indexOf(marker);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
    expect(statsSource).toContain('testID="stats-comparison-content"');
    expect(activeSurface).not.toContain('testID="stats-today-benefits"');
    expect(activeSurface).not.toContain('testID="stats-active-xp-multipliers"');
  });

  it('does not expose the rejected legacy accordions in the active surface', () => {
    expect(activeSurface).not.toContain('stats-series-protection-toggle');
    expect(activeSurface).not.toContain('testID="stats-series-status"');
    expect(activeSurface).not.toContain('<StreakStatsHero');
    expect(activeSurface).not.toContain('stats-comparison-toggle');
    expect(activeSurface).not.toContain('legacy-stats-details-toggle');
  });

  it('uses borderless theme surfaces and precise rolling-period copy', () => {
    expect(activeSurface).not.toContain('borderWidth: 1');
    expect(statsSource).toContain('чем за предыдущие 7 дней');
  });

  it('keeps the week analytics as one surface without nested gradient panels', () => {
    expect(weekSurface).toContain('testID="stats-primary-metric-selector"');
    const graphStart = weekSurface.indexOf('testID="stats-primary-weekly-chart"');
    const graphEnd = weekSurface.indexOf('<StatBars', graphStart);
    expect(graphStart).toBeGreaterThan(-1);
    expect(weekSurface.slice(graphStart, graphEnd)).not.toContain('<LinearGradient');
    const summaryStart = weekSurface.indexOf('testID="stats-primary-summary"');
    expect(summaryStart).toBeGreaterThan(-1);
    expect(weekSurface.slice(summaryStart, summaryStart + 1200)).not.toContain('<LinearGradient');
  });

  it('uses truthful time magnitudes and visible calendar dates (XP removed, D02)', () => {
    expect(weekSurface).toContain("metric === 'time'");
    expect(weekSurface).toContain('day.minutes');
    expect(weekSurface).not.toContain('day.points');
    expect(weekSurface).not.toContain("metric === 'activity'");
    expect(weekSurface).not.toContain('day.combined');
    expect(weekSurface).toContain('`${day.shortLabel} ${day.dayNum}`');
  });

  it('keeps series status and protection in the free streak hero', () => {
    expect(heroSurface).toContain('testID="stats-streak-hero"');
    expect(heroSurface).toContain('testID="stats-primary-series"');
    expect(heroSurface).toContain('testID="stats-series-protection-status"');
    expect(heroSurface).toContain('testID="stats-series-freeze-action"');
    expect(statsSource).not.toContain('stats-series-wager');
  });

  it('places the free series hero before the Plus-only analytics content', () => {
    const heroIndex = activeSurface.indexOf('<StreakHeroCard');
    const lockedIndex = activeSurface.indexOf('testID="stats-free-locked-analytics"');
    expect(heroIndex).toBeGreaterThan(-1);
    expect(lockedIndex).toBeGreaterThan(heroIndex);
    expect(weekSurface).toContain('<StatsPremiumBlur');
    expect(heroSurface).not.toContain('<StatsPremiumBlur');
  });

  it('renders achievement art instead of definition emoji', () => {
    expect(recentSurface).toContain('<AchievementArt achievementId={achievement.id}');
    expect(recentSurface).not.toContain('achievement.icon');
    expect(recentSurface).not.toContain('<StatsCardArtSurface');
    expect(recentSurface).toContain("backgroundColor: 'transparent'");
  });

  it('keeps synchronous cached first-frame hydration', () => {
    expect(statsSource).toContain('const _sc = getStatsCache(studyTarget)');
    expect(statsSource).toContain('useState(_sc.loaded)');
    expect(statsSource).not.toContain('ActivityIndicator');
  });
});
