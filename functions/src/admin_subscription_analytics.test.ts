import fs from 'fs';
import path from 'path';
import { clampSubscriptionAnalyticsDays, normalizeSubscriptionStore } from './admin_subscription_analytics';

describe('admin subscription analytics callable contract', () => {
  it('normalizes range and store filters', () => {
    expect(clampSubscriptionAnalyticsDays(7)).toBe(7);
    expect(clampSubscriptionAnalyticsDays(90)).toBe(90);
    expect(clampSubscriptionAnalyticsDays(365)).toBe(28);
    expect(normalizeSubscriptionStore('APP_STORE')).toBe('APP_STORE');
    expect(normalizeSubscriptionStore('bad')).toBe('all');
  });

  it('requires money.read and returns aggregate limitations without identifiers', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_subscription_analytics.ts'), 'utf8');
    expect(source).toContain("hasClaimedPermission(request.auth?.token, 'money.read')");
    expect(source).toContain('reasons_available_for_new_webhook_events_only');
    expect(source).toContain('historical_cancel_reason_not_stored');
    expect(source).toContain('historical_expiration_reason_not_stored');
    expect(source).toContain('no_screen_subscription_join');
    expect(source).not.toContain('uid: row.uid');
    expect(source).not.toContain('transactionId: row.transactionId');
  });

  it('paginates with a hard safety cap and reports truncation', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_subscription_analytics.ts'), 'utf8');
    expect(source).toContain('const PAGE_SIZE = 500');
    expect(source).toContain('const DOCUMENT_CAP = 5000');
    expect(source).toContain('reachedCap = true');
    expect(source).toContain('aggregateSubscriptionAnalytics(filtered, reachedCap, { fromMs })');
  });
});
