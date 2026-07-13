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

  it('invalidates late activity/percentile completions when the screen loses focus', () => {
    expect(source).toContain('analyticsLoadRequestRef.current += 1');
    expect(source).toContain('isCurrentStatsInsightsLoadCycle(analyticsRequestId, analyticsLoadRequestRef.current)');
    expect(source).toContain("setLifetimeStatus(cachedLifetimeForCycle ? 'ready' : 'unavailable')");
    expect(source).not.toContain('setActivity365(null)');
    expect(source).toContain('const devStatsCycleId = await loadAll()');
    expect(source).toContain('if (devStatsCycleId === null)');
    expect(source).toContain('isCurrentStatsInsightsLoadCycle(devStatsCycleId, analyticsLoadRequestRef.current)');
    expect(source).toContain('return finishStatsInsightsLoadCycle(analyticsRequestId');
  });
});
