import assert from 'node:assert/strict';
import test from 'node:test';
import { renderAdminAnalytics } from '../admin/v2/scripts/admin-analytics-view.js';
import { completeAnalyticsLoad } from '../admin/v2/scripts/admin-analytics-state.js';

function emptySource() {
  return { state: 'empty', count: 0, truncated: false, latestAtMs: null, errorCode: null };
}

test('renders an unavailable funnel ratio as an em dash', () => {
  const html = renderAdminAnalytics({
    status: 'ready', authorized: true, busy: false, rangeDays: 28,
    snapshot: {
      state: 'ready', definitionVersion: 'test', generatedAtMs: 1, rangeDays: 28,
      sources: { users: emptySource(), app_activity: emptySource(), revenuecat_premium_events: emptySource(), revenuecat_shard_transactions: emptySource(), paywall_funnel: emptySource() },
      access: { activeAccessTotal: 0, storeBackedTotal: 0, activeTrials: 0, scannedUsers: 0, byKind: {} },
      storeActivity: {}, shardActivity: {}, funnelSignals: { events: {}, purchaseSignalRate: null }, appActivity: {},
    },
  });
  assert.match(html, /<strong>—<\/strong><small>purchase_completed ÷ shown<\/small>/);
  assert.doesNotMatch(html, /<strong>0\.0%<\/strong><small>purchase_completed ÷ shown<\/small>/);
});

test('preserves the last good snapshot when the callable returns an error snapshot', () => {
  const goodSnapshot = { state: 'ready', generatedAtMs: 100 };
  const previous = { status: 'ready', snapshot: goodSnapshot, error: '', rangeDays: 28 };
  const next = completeAnalyticsLoad(previous, { state: 'error', generatedAtMs: 200 }, 28);
  assert.equal(next.status, 'error');
  assert.equal(next.snapshot, goodSnapshot);
  assert.match(next.error, /источники/i);
});
