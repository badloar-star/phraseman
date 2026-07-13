import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_stats.tsx'), 'utf8');

describe('streak stats verified hybrid insight wiring', () => {
  it('uses only the four-block verified analyzer/client path', () => {
    expect(source).toContain('buildStatsInsightAnalysis');
    expect(source).toContain('getVerifiedStatsInsightsState');
    expect(source).toContain('generateVerifiedStatsInsights');
    expect(source).toContain("renderAiNote('week'");
    expect(source).toContain("renderAiNote('longTerm'");
    expect(source).toContain("renderAiNote('comparison'");
    expect(source).toContain("renderAiNote('lifetime'");
    expect(source).not.toContain('StatsInsightsBriefing');
    expect(source).not.toContain('buildLocalStatsInsights');
    expect(source).not.toContain('generateStatsInsights({ briefing');
  });

  it('waits for explicit activity and percentile readiness and keys generation by the semantic fingerprint', () => {
    expect(source).toContain("useState<'loading' | 'ready' | 'unavailable'>('loading')");
    expect(source).toContain('activityStatus: activity365Status');
    expect(source).toContain('percentilesStatus: percentilesStatus');
    expect(source).toContain("const [lifetimeStatus, setLifetimeStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')");
    expect(source).toContain("setActivity365Status('loading')");
    expect(source).toContain("setPercentilesStatus('loading')");
    expect(source).toContain("setLifetimeStatus('loading')");
    expect(source).toContain("lifetimeStatus: lifetimeStatus");
    expect(source).toContain('statsInsightAnalysis?.fingerprint');
    expect(source).toContain('completedInsightsLoadCycleId');
    expect(source).toContain('completedCycleId: completedInsightsLoadCycleId');
    expect(source).not.toContain('eslint-disable-next-line react-hooks/exhaustive-deps');
  });

  it('keeps comparison copy attached to an honest percentile context', () => {
    expect(source).toContain("percentiles.sample.status === 'below_sample_floor'");
    expect(source).toContain("percentiles.sample.status === 'unavailable'");
    expect(source).toContain('percentiles.sample.minimumSampleXp');
    expect(source).not.toContain("renderAiNote('percentiles'");
  });

  it('shows only one free teaser even if a former Premium cache exists', () => {
    expect(source).toContain("if (!isPremium && block !== 'week')");
  });

  it('binds notes to the exact fingerprint without ordinary observation rotation', () => {
    expect(source).toContain('notesForStatsInsightsFingerprint(statsInsightAnalysis?.fingerprint ?? null, aiNotesState)');
    expect(source).toContain('const requestFingerprint = statsInsightAnalysis.fingerprint');
    expect(source).not.toContain('previousObservationIdsRef');
    expect(source).toContain('buildStatsInsightAnalysis(statsInsightsSnapshot)');
  });

  it('keeps the resolved comparison card mounted during background loading', () => {
    expect(source).toContain('const [hasResolvedPercentiles, setHasResolvedPercentiles] = useState(false)');
    expect(source).toContain('shouldRenderStatsComparison(hasResolvedPercentiles)');
    expect(source).not.toContain("if (percentilesStatus === 'loading')\n                return null");
  });

  it('invalidates late activity/percentile completions when the screen loses focus', () => {
    expect(source).toContain('analyticsLoadRequestRef.current += 1');
    expect(source).toContain('isCurrentStatsInsightsLoadCycle(analyticsRequestId, analyticsLoadRequestRef.current)');
    expect(source).toContain("setLifetimeStatus(cachedLifetimeForCycle ? 'ready' : 'unavailable')");
    expect(source).not.toContain('setActivity365(null)');
    expect(source).toContain('const devStatsCycleId = await loadAll()');
    expect(source).toContain('if (devStatsCycleId === null)');
    expect(source).toContain('isCurrentStatsInsightsLoadCycle(devStatsCycleId, analyticsLoadRequestRef.current)');
    expect(source).toContain('const completedCycleId = await finishStatsInsightsLoadCycle(analyticsRequestId');
    expect(source).toMatch(/const snapshot = await refreshStatsCache\(studyTarget\);\s*if \(!isCurrentStatsInsightsLoadCycle\(analyticsRequestId, analyticsLoadRequestRef\.current\)\)\s*return null;/);
    expect(source).toMatch(/const activeLeagueBoost = await loadActiveLeagueBoost\(\)\.catch\(\(\) => null\);\s*if \(!isCurrentStatsInsightsLoadCycle\(analyticsRequestId, analyticsLoadRequestRef\.current\)\)\s*return null;/);
    expect(source).toMatch(/const activeLeagueGroupBoost = await getActiveLeagueGroupBoost\(\)\.catch\(\(\) => null\);\s*if \(!isCurrentStatsInsightsLoadCycle\(analyticsRequestId, analyticsLoadRequestRef\.current\)\)\s*return null;/);
    expect(source).toContain('isCurrentStatsInsightsLoadCycle(analyticsRequestId, analyticsLoadRequestRef.current))\n                setWeekLearned(counts)');
  });

  it('invalidates a dev action before it can start a new load cycle after blur', () => {
    expect(source).toContain('const devActionCycleId = analyticsLoadRequestRef.current');
    expect(source).toMatch(/const sums = await devRandomizeLifetimePathDailyMetrics\(7\);\s*if \(!isCurrentStatsInsightsLoadCycle\(devActionCycleId, analyticsLoadRequestRef\.current\)\)\s*return;\s*setLifetimeChartSeed/);
    expect(source).toContain('statsScreenFocusedRef.current = false');
    expect(source).toContain('const devBusyCycleId = devStatsCycleIdForBusy ?? devActionCycleId');
    expect(source).toContain('statsScreenFocusedRef.current && isCurrentStatsInsightsLoadCycle(devBusyCycleId, analyticsLoadRequestRef.current)');
  });
});
