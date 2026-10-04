import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const statsSource = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
// 04.10: опыт удалён (D02) — StatsXpProgressSummary стёрт в снимке 2.0 (efe19ae9d), сторож его больше не читает.
const metricPath = path.join(ROOT, 'app', 'stats_primary_metric.ts');
const metricSource = fs.existsSync(metricPath) ? fs.readFileSync(metricPath, 'utf8') : '';
const keySource = fs.readFileSync(path.join(ROOT, 'app', 'target_storage_keys.ts'), 'utf8');
const activeStart = statsSource.indexOf('<BouncyWrap>');
const activeEnd = statsSource.indexOf('{false &&', activeStart);
const activeSurface = statsSource.slice(activeStart, activeEnd);

describe('selected statistics design contract', () => {
  it('keeps one persisted primary visual with exactly the approved metric choices', () => {
    expect(metricSource).toContain(
      "STATS_PRIMARY_METRICS = ['time', 'year']",
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
    expect(statsSource).not.toContain('StatsXpProgressSummary');
    expect(statsSource).not.toContain('totalXP={totalXP}');
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
    // 2026-09-13 (владелец): замки статистики без отдельного PlusBadge — lock/gold CTA StatsPremiumBlur.
    expect(activeSurface).not.toContain('<PlusBadge');
  });

  // 04.10: вкладка называется «Год» с редизайна экрана 18.07 (c376a329e, сегмент «Время / Год» как в макете);
  // ключ хранения прежний — 'year'.
  it('labels the year tab «Год» while retaining its persisted key', () => {
    expect(statsSource).toContain("year: { ru: 'Год'");
    expect(statsSource).toContain("const WEEK_SEGMENT_METRICS: readonly StatsPrimaryMetric[] = ['time', 'year'];");
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
