import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const statsSource = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
const xpSummarySource = fs.readFileSync(path.join(ROOT, 'components', 'StatsXpProgressSummary.tsx'), 'utf8');
const metricPath = path.join(ROOT, 'app', 'stats_primary_metric.ts');
const metricSource = fs.existsSync(metricPath) ? fs.readFileSync(metricPath, 'utf8') : '';
const keySource = fs.readFileSync(path.join(ROOT, 'app', 'target_storage_keys.ts'), 'utf8');
const activeStart = statsSource.indexOf('<BouncyWrap>');
const activeEnd = statsSource.indexOf('{false &&', activeStart);
const activeSurface = statsSource.slice(activeStart, activeEnd);

describe('selected statistics design contract', () => {
  it('keeps one persisted primary visual with exactly the approved metric choices', () => {
    expect(metricSource).toContain(
      "STATS_PRIMARY_METRICS = ['xp', 'time', 'year']",
    );
    expect(keySource).toContain('statsPrimaryMetricKey');
    expect(statsSource).toContain('testID="stats-primary-metric-selector"');
    expect(statsSource).toContain('testID="stats-primary-analytics"');
    expect(statsSource).toContain('testID={`stats-primary-metric-${option}`}');
    expect(statsSource).not.toContain('stats-primary-metric-activity');
    expect(statsSource).not.toContain('testID="stats-primary-metric-learned"');
  });

  it('removes Compass, the practice CTA and the separate whole-path surface', () => {
    expect(statsSource).not.toContain('stats_insights_client');
    expect(statsSource).not.toContain('renderAiNote(');
    expect(statsSource).not.toContain('testID="stats-today-action"');
    expect(statsSource).not.toContain('testID="stats-details-toggle"');
  });

  it('keeps approved functions behind concise progressive disclosure', () => {
    expect(statsSource).toContain('StatsXpProgressSummary');
    expect(statsSource).toContain('totalXP={totalXP}');
    expect(xpSummarySource).toContain('testID="stats-xp-progress-expand"');
    expect(statsSource).toContain('testID="stats-recent-achievements"');
    expect(statsSource).toContain("router.push('/achievements_screen'");
    expect(statsSource).not.toContain('testID="stats-today-benefits"');
    expect(activeSurface).not.toContain('<TodaysBoonStrip');
    expect(statsSource).toContain('testID="stats-primary-series"');
    expect(activeSurface).not.toContain('testID="stats-series-status"');
    expect(statsSource).toContain('testID="stats-comparison-content"');
    expect(activeSurface).not.toContain('testID="stats-series-protection-toggle"');
    expect(activeSurface).not.toContain('testID="stats-comparison-toggle"');
    expect(statsSource).toContain('context="percentiles"');
    expect(statsSource).toContain('<PlusBadge');
    expect(statsSource).toContain('{!isPremium && <PlusBadge themeMode={themeMode} size="xs"/>}');
  });

  it('keeps the 365-day label while retaining its persisted key', () => {
    expect(statsSource).toContain("year: { ru: '365 дней'");
    expect(statsSource).toContain("ru: 'Последние 365 дней'");
  });

  it('uses a compact padded time label for hour-and-minute totals', () => {
    expect(statsSource).toContain("String(m).padStart(2, '0')");
  });

  it('does not restore rejected explanatory microcopy', () => {
    expect(statsSource).not.toContain('Сначала самые свежие полученные');
    expect(statsSource).not.toContain('Сравнение доступно с Plus');
    expect(statsSource).not.toContain('Заморозка, восстановление и бонусы');
  });
});
