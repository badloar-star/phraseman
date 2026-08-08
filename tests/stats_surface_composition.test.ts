import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const statsSource = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
const activeStart = statsSource.indexOf('<BouncyWrap>');
const activeEnd = statsSource.indexOf('{false &&', activeStart);
const activeSurface = statsSource.slice(activeStart, activeEnd);
const recentStart = statsSource.indexOf('function RecentAchievementsCard');
const recentEnd = statsSource.indexOf('export default function StreakStats', recentStart);
const recentSurface = statsSource.slice(recentStart, recentEnd);
const primaryStart = statsSource.indexOf('function PrimaryAnalyticsCard');
const primaryEnd = statsSource.indexOf('function RecentAchievementsCard', primaryStart);
const primarySurface = statsSource.slice(primaryStart, primaryEnd);

describe('statistics surface composition', () => {
  it('keeps the results surface focused on progress, not temporary bonuses', () => {
    const orderedMarkers = [
      '<PrimaryAnalyticsCard',
      '<RecentAchievementsCard',
      'testID="stats-comparison-content"',
    ];

    let cursor = -1;
    for (const marker of orderedMarkers) {
      const next = activeSurface.indexOf(marker);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
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

  it('keeps one outer primary surface without nested graph or summary surfaces', () => {
    const selectorStart = primarySurface.indexOf('testID="stats-primary-metric-selector"');
    const selectorEnd = primarySurface.indexOf('</TouchableOpacity>', selectorStart);
    const selectorSurface = primarySurface.slice(selectorStart, selectorEnd);
    expect(selectorSurface).toContain('<LinearGradient');
    const graphStart = primarySurface.indexOf('testID="stats-primary-weekly-chart"');
    const graphEnd = primarySurface.indexOf('<StatBars', graphStart);
    expect(primarySurface.slice(graphStart, graphEnd)).not.toContain('<LinearGradient');
    const summaryStart = primarySurface.indexOf('testID="stats-primary-summary"');
    const summaryEnd = primarySurface.indexOf('{progressParts.length', summaryStart);
    expect(primarySurface.slice(summaryStart, summaryEnd)).not.toContain('<LinearGradient');
    const multiplierStart = activeSurface.indexOf('testID="stats-active-xp-multipliers"');
    const multiplierEnd = activeSurface.indexOf('</TouchableOpacity>', multiplierStart);
    expect(activeSurface.slice(multiplierStart, multiplierEnd)).not.toContain('<LinearGradient');
  });

  it('uses truthful XP/time magnitudes and visible calendar dates', () => {
    expect(primarySurface).toContain("metric === 'time'");
    expect(primarySurface).toContain('day.minutes');
    expect(primarySurface).toContain('day.points');
    expect(primarySurface).not.toContain("metric === 'activity'");
    expect(primarySurface).not.toContain('day.active ? 1 : 0');
    expect(primarySurface).not.toContain('day.combined');
    expect(primarySurface).toContain('`${day.shortLabel} ${day.dayNum}`');
  });

  it('keeps series protection discoverable without removing the action', () => {
    expect(primarySurface).toContain('testID="stats-series-protection-status"');
    expect(primarySurface).toContain('testID="stats-series-freeze-action"');
  });

  it('integrates streak status and contextual actions into the primary surface', () => {
    expect(primarySurface).toContain('testID="stats-primary-series"');
    expect(primarySurface).toContain('testID="stats-series-freeze-action"');
    expect(primarySurface).toContain('testID="stats-series-wager-action"');
    expect(activeSurface).toContain('testID="stats-series-wager-modal"');
  });

  it('places the free series controls before the Plus-only analytics content', () => {
    const seriesStart = primarySurface.indexOf('testID="stats-primary-series"');
    const premiumStart = primarySurface.indexOf('<StatsPremiumBlur');

    expect(seriesStart).toBeGreaterThan(-1);
    expect(premiumStart).toBeGreaterThan(-1);
    expect(seriesStart).toBeLessThan(premiumStart);
  });

  it('renders real achievement image assets instead of definition emoji', () => {
    expect(statsSource).toContain(
      "import { ACHIEVEMENT_IMAGE } from '../constants/achievementImageAssets'",
    );
    expect(recentSurface).toContain('ACHIEVEMENT_IMAGE[achievement.id]');
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
