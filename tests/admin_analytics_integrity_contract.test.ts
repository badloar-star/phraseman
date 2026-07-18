import {
  aggregateAnalyticsConsent,
  assessFunnelIntegrity,
  assessPurchaseSignalReconciliation,
} from '../functions/src/admin_analytics_core';
import fs from 'node:fs';
import path from 'node:path';

describe('admin analytics integrity contract', () => {
  it('blocks a paywall decision when the aggregate and daily series disagree', () => {
    expect(assessFunnelIntegrity({
      aggregate: { shown: 506, ctaClick: 91, trialStarted: 18, purchaseCompleted: 23 },
      series: { shown: 0, ctaClick: 0, trialStarted: 0, purchaseCompleted: 0 },
      sourceState: 'ready',
    })).toEqual({
      status: 'blocked',
      reason: 'aggregate_series_mismatch',
      aggregateTotal: 638,
      seriesTotal: 0,
    });
  });

  it('marks a complete matching funnel as decision-ready', () => {
    expect(assessFunnelIntegrity({
      aggregate: { shown: 50, ctaClick: 14, trialStarted: 5, purchaseCompleted: 4 },
      series: { shown: 50, ctaClick: 14, trialStarted: 5, purchaseCompleted: 4 },
      sourceState: 'ready',
    })).toEqual({
      status: 'ready',
      reason: null,
      aggregateTotal: 73,
      seriesTotal: 73,
    });
  });

  it('does not mistake an unavailable source for a zero funnel', () => {
    expect(assessFunnelIntegrity({
      aggregate: { shown: 0, ctaClick: 0, trialStarted: 0, purchaseCompleted: 0 },
      series: { shown: null, ctaClick: null, trialStarted: null, purchaseCompleted: null },
      sourceState: 'error',
    })).toEqual({
      status: 'unavailable',
      reason: 'source_unavailable',
      aggregateTotal: 0,
      seriesTotal: null,
    });
  });

  it('does not mark a truncated funnel source as decision-ready', () => {
    expect(assessFunnelIntegrity({
      aggregate: { shown: 50, ctaClick: 14, trialStarted: 5, purchaseCompleted: 4 },
      series: { shown: 50, ctaClick: 14, trialStarted: 5, purchaseCompleted: 4 },
      sourceState: 'partial',
    })).toMatchObject({ status: 'unavailable', reason: 'source_unavailable', seriesTotal: null });
  });

  it('keeps RevenueCat and client purchase signals diagnostic rather than an attributed conversion', () => {
    expect(assessPurchaseSignalReconciliation({
      clientPurchaseSignals: 23,
      confirmedPurchaseEvents: 18,
      clientSourceState: 'ready',
      storeSourceState: 'ready',
    })).toEqual({
      status: 'observational',
      reason: 'different_coverage_and_identity',
      clientPurchaseSignals: 23,
      confirmedPurchaseEvents: 18,
      exactAttributionAvailable: false,
      conversionRate: null,
    });
  });

  it('withholds reconciliation when either source is incomplete or unavailable', () => {
    expect(assessPurchaseSignalReconciliation({
      clientPurchaseSignals: 23,
      confirmedPurchaseEvents: 18,
      clientSourceState: 'partial',
      storeSourceState: 'ready',
    })).toMatchObject({
      status: 'unavailable',
      reason: 'source_incomplete_or_unavailable',
      exactAttributionAvailable: false,
      conversionRate: null,
    });
  });

  it('reports consent coverage without treating unset as a refusal', () => {
    expect(aggregateAnalyticsConsent([
      { id: 'granted', analyticsConsent: 'granted' },
      { id: 'denied', analyticsConsent: 'denied' },
      { id: 'unset', analyticsConsent: 'unset' },
      { id: 'missing' },
      { id: 'hidden', analyticsConsent: 'granted', identityHidden: true },
    ])).toEqual({
      observedUsers: 4,
      granted: 1,
      denied: 1,
      unset: 2,
      grantedRate: 0.25,
      hiddenUsersExcluded: 1,
    });
  });

  it('carries the reconciliation result into the export-and-quality report', () => {
    const root = path.resolve(__dirname, '..');
    const state = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-analytics-state.js'), 'utf8');
    const view = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-analytics-view.js'), 'utf8');

    expect(state).toContain('paywallIntegrity');
    expect(state).toContain('aggregate_series_mismatch');
    expect(state).toContain('purchaseSignalReconciliation');
    expect(view).toContain('integritySection');
    expect(view).toContain('purchaseReconciliationSection');
    expect(view).toContain('initialSubscriptionEvents');
    expect(view).toContain('nonRenewingPurchaseEvents');
    expect(view).toContain('Сигналы завершения на 100 показов');
    expect(view).toContain('Не конверсия пользователей и не подтверждённые покупки');
    expect(view).toContain('Нельзя принимать решение по paywall');
    expect(view).toContain('consentCoverageSection');
    expect(view).toContain('Доля согласившихся на аналитику');
  });
});
