import { evaluatePmPublicationGate } from './admin_pm_publication_gate';
import type { PmEvidenceBundle } from './admin_pm_evidence';

function coverage(status: 'ok' | 'partial' | 'failed') {
  return { sourceId: 'x', status, rowCount: 1, uniqueCount: 1, truncated: false, timestampField: 'createdAtMs', window: { startMs: 0, endMs: 1 } };
}

test('requires ok current and previous coverage in all four core domains', () => {
  const bundle = {
    coverage: {
      users: { current: coverage('ok'), previous: coverage('ok') },
      progress_events: { current: coverage('ok'), previous: coverage('ok') },
      revenuecat_premium_events: { current: coverage('ok'), previous: coverage('partial') },
      app_errors: { current: coverage('ok'), previous: coverage('ok') },
    },
    metrics: {
      'growth_activation.users.events': { domain: 'growth_activation', sourceId: 'users' },
      'learning_engagement.progress_events.events': { domain: 'learning_engagement', sourceId: 'progress_events' },
      'revenue.revenuecat_premium_events.events': { domain: 'revenue', sourceId: 'revenuecat_premium_events' },
      'quality_support.app_errors.events': { domain: 'quality_support', sourceId: 'app_errors' },
    },
  } as unknown as PmEvidenceBundle;

  expect(evaluatePmPublicationGate(bundle)).toEqual({
    mode: 'coverage_only',
    missingDomains: ['revenue'],
    coreDomains: ['growth_activation', 'learning_engagement', 'revenue', 'quality_support'],
  });
});

test('opens full mode only when every core domain has current and previous ok coverage', () => {
  const bundle = {
    coverage: {
      users: { current: coverage('ok'), previous: coverage('ok') },
      progress_events: { current: coverage('ok'), previous: coverage('ok') },
      revenuecat_premium_events: { current: coverage('ok'), previous: coverage('ok') },
      app_errors: { current: coverage('ok'), previous: coverage('ok') },
    },
    metrics: {
      'growth_activation.users.events': { domain: 'growth_activation', sourceId: 'users' },
      'learning_engagement.progress_events.events': { domain: 'learning_engagement', sourceId: 'progress_events' },
      'revenue.revenuecat_premium_events.events': { domain: 'revenue', sourceId: 'revenuecat_premium_events' },
      'quality_support.app_errors.events': { domain: 'quality_support', sourceId: 'app_errors' },
    },
  } as unknown as PmEvidenceBundle;

  expect(evaluatePmPublicationGate(bundle).mode).toBe('full');
});
