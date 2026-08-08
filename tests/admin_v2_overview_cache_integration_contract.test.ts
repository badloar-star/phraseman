import fs from 'node:fs'; import path from 'node:path';
const core = fs.readFileSync(path.resolve(__dirname, '../admin/v2/scripts/admin-core.js'), 'utf8');
describe('Admin v2 overview cache integration', () => {
  test('hydrates only an authorized opaque scope before rendering and clears it on account change', () => {
    expect(core).toContain("from './admin-overview-cache.js'");
    expect(core).toContain('function hydrateOverviewBriefingFromCache(scope)');
    expect(core).toContain('hydrateOverviewBriefingFromCache(scope);');
    expect(core).toContain('overviewCache.clear(overviewCacheScope);');
  });
  test('preserves cached data through loading/error and keeps equal reads quiet', () => {
    expect(core).toContain('overviewCache.markLoading(overviewCacheScope)');
    expect(core).toContain('overviewCache.markError(overviewCacheScope');
    expect(core).toContain('overviewCache.write(overviewCacheScope, nextBriefing)');
    expect(core).toContain('if (cached?.changed === false)');
  });

  test('hydrates before the post-scope render and refreshes a stale cache once without a loading repaint', () => {
    const scopeBlock = core.slice(core.indexOf('async function establishDashboardWidgetScope'), core.indexOf('function hydrateOverviewBriefingFromCache'));
    const maybeLoadBlock = core.slice(core.indexOf('function maybeLoadOperationalBriefing'), core.indexOf('function applySupportListResult'));
    const loadBlock = core.slice(core.indexOf('async function loadDailyBriefing'), core.indexOf('async function loadReportQueue'));

    expect(scopeBlock.indexOf('hydrateOverviewBriefingFromCache(scope);')).toBeLessThan(scopeBlock.lastIndexOf('renderCurrentPage();'));
    expect(maybeLoadBlock).toContain("['idle', 'stale'].includes(state.briefing.state)");
    expect(maybeLoadBlock).toContain('overviewBriefingRefreshInFlight');
    expect(maybeLoadBlock).toContain('loadDailyBriefing(false, { quiet })');
    expect(loadBlock).toContain('const quietRefresh = quiet && Boolean(state.briefing.digest);');
    expect(loadBlock).toContain('if (!quietRefresh)');
    expect(loadBlock).toContain('return QUIET_CACHE_RESULT;');
  });
});
