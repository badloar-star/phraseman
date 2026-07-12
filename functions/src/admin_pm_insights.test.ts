import { computeProductInsights, filterRejectedProductIntents, fingerprintProductIntent } from './admin_pm_insights';
import type { PmEvidenceBundle } from './admin_pm_evidence';

function bundle(): PmEvidenceBundle {
  return {
    windows: {
      current: { startMs: 100, endMs: 200 },
      previous: { startMs: 0, endMs: 100 },
      context: [
        { days: 7, window: { startMs: -500, endMs: 200 } },
        { days: 28, window: { startMs: -2600, endMs: 200 } },
      ],
    },
    coverage: {},
    evidence: [
      { evidenceId: 'ev:growth_activation.users.events.current', metricId: 'growth_activation.users.events', sourceId: 'users', domain: 'growth_activation', windowKey: 'current', value: 12, codexEntityIds: ['metric:growth_activation.users.events'], coverageStatus: 'ok' },
      { evidenceId: 'ev:growth_activation.users.events.previous', metricId: 'growth_activation.users.events', sourceId: 'users', domain: 'growth_activation', windowKey: 'previous', value: 0, codexEntityIds: ['metric:growth_activation.users.events'], coverageStatus: 'ok' },
      { evidenceId: 'ev:revenue.revenuecat_premium_events.events.current', metricId: 'revenue.revenuecat_premium_events.events', sourceId: 'revenuecat_premium_events', domain: 'revenue', windowKey: 'current', value: 4, codexEntityIds: ['metric:revenue.revenuecat_premium_events.events'], coverageStatus: 'ok' },
      { evidenceId: 'ev:revenue.revenuecat_premium_events.events.previous', metricId: 'revenue.revenuecat_premium_events.events', sourceId: 'revenuecat_premium_events', domain: 'revenue', windowKey: 'previous', value: 1, codexEntityIds: ['metric:revenue.revenuecat_premium_events.events'], coverageStatus: 'ok' },
    ],
    metrics: {
      'growth_activation.users.events': { metricId: 'growth_activation.users.events', sourceId: 'users', domain: 'growth_activation', current: 12, previous: 0, context: { '7d': 50, '28d': 120 }, caveats: [] },
      'revenue.revenuecat_premium_events.events': { metricId: 'revenue.revenuecat_premium_events.events', sourceId: 'revenuecat_premium_events', domain: 'revenue', current: 4, previous: 1, context: { '7d': 10, '28d': 40 }, caveats: [] },
      'quality_support.app_errors.events': { metricId: 'quality_support.app_errors.events', sourceId: 'app_errors', domain: 'quality_support', current: 9, previous: 2, context: { '7d': 12, '28d': 30 }, caveats: ['app_errors:partial:page_limit_reached'] },
    },
  };
}

test('computes deltas and keeps percent null when previous is zero', () => {
  const insights = computeProductInsights(bundle());
  expect(insights.facts.find((fact) => fact.metricId === 'growth_activation.users.events')).toMatchObject({
    current: 12,
    previous: 0,
    absoluteDelta: 12,
    percentDelta: null,
    confidence: 1,
  });
});

test('separates anomalies from facts and lowers confidence for caveated metrics', () => {
  const insights = computeProductInsights(bundle(), { anomalyPercentThreshold: 100 });
  expect(insights.anomalies.map((item) => item.metricId)).toEqual(expect.arrayContaining([
    'revenue.revenuecat_premium_events.events',
    'quality_support.app_errors.events',
  ]));
  expect(insights.facts.find((fact) => fact.metricId === 'quality_support.app_errors.events')?.confidence).toBeLessThan(1);
});

test('creates stable normalized fingerprints and evidence hashes', () => {
  const first = fingerprintProductIntent({
    domain: 'revenue',
    title: '  Improve Paywall CTA! ',
    evidenceIds: ['ev:b', 'ev:a'],
  });
  const second = fingerprintProductIntent({
    domain: 'revenue',
    title: 'improve paywall cta',
    evidenceIds: ['ev:a', 'ev:b'],
  });
  expect(first).toEqual(second);
  expect(first).toMatch(/^revenue:/);
});

test('suppresses rejected fingerprints only when evidence did not materially change', () => {
  const rejected = new Set([
    fingerprintProductIntent({ domain: 'revenue', title: 'Improve paywall CTA', evidenceIds: ['ev:a'] }),
  ]);
  const items = [
    { domain: 'revenue' as const, title: 'Improve paywall CTA', evidenceIds: ['ev:a'] },
    { domain: 'revenue' as const, title: 'Improve paywall CTA', evidenceIds: ['ev:a', 'ev:new'] },
  ];
  expect(filterRejectedProductIntents(items, rejected)).toEqual([items[1]]);
});
