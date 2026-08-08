import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ActivityHeatmap365.tsx'), 'utf8');

describe('canonical yearly activity heatmap', () => {
  it('renders all weeks without a horizontal scroller', () => {
    const start = source.indexOf('function CanonicalYearHeatmap');
    const end = source.indexOf('function MonthExplorerModal', start);
    const heatmap = source.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(heatmap).toContain('testID="activity-365-full-year"');
    expect(heatmap).not.toContain('model.monthStarts');
    expect(heatmap).toContain('YEAR_GRID_COLS');
    expect(heatmap).not.toContain('<ScrollView');
    expect(heatmap).not.toContain('<StatsCardArtSurface');
    expect(heatmap).not.toContain('<LinearGradient');
  });

  it('uses a dedicated month modal with sibling calendar and comparison entities', () => {
    expect(source).toContain('testID="activity-365-month-modal"');
    expect(source).toContain('testID="activity-365-month-calendar"');
    expect(source).toContain('testID="activity-365-month-comparison"');
    expect(source).toContain('monthComparisonSummary(days, resolvedMonthA)');
    expect(source).toContain('monthComparisonSummary(days, resolvedMonthB)');
    expect(source).toContain('monthGrid.cells.map');
    expect(source).not.toContain('MonthlyReportModal');
    expect(source).not.toContain('GOALS');
    expect(source).not.toContain('metricRail');
    expect(source).not.toContain('filterRow');
  });

  it('always uses the full 365-day geometry without detached month labels', () => {
    expect(source).toContain('const YEAR_DAYS = 365;');
    expect(source).toContain('<CanonicalYearHeatmap');
    expect(source).not.toContain('observedDays.length < YEAR_DAYS');
    expect(source).not.toContain('<CompactHistoryHeatmap');
    expect(source).not.toContain('yearHeaderSurface');
    expect(source).not.toContain('monthLabels');
  });
});
