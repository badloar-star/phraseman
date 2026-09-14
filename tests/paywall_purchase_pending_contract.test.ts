import fs from 'fs';
import path from 'path';

describe('paywall purchase pending analytics', () => {
  const purchase = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');
  const analytics = fs.readFileSync(path.join(process.cwd(), 'app', 'analytics.ts'), 'utf8');
  const catalog = fs.readFileSync(path.join(process.cwd(), 'app', 'product_analytics_event_catalog.ts'), 'utf8');
  const warehouse = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'admin_product_analytics.ts'), 'utf8');
  const governance = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'app', 'product_analytics_governance.json'), 'utf8'),
  ) as { events: { name: string }[]; metrics: { id: string; events: string[] }[] };
  const pendingStart = purchase.indexOf('PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR');
  const pendingEnd = purchase.indexOf('} else {', pendingStart);
  const pendingBranch = purchase.slice(pendingStart, pendingEnd);

  test('pending is its own governed outcome and never a failure', () => {
    expect(pendingStart).toBeGreaterThan(-1);
    expect(pendingBranch).toContain("trackEvent('purchase_pending'");
    expect(pendingBranch).toContain('context, source, plan: selected');
    expect(pendingBranch).not.toContain("trackEvent('purchase_failed'");
    expect(analytics).toContain("| 'purchase_pending'");
    expect(catalog).toContain("'purchase_pending'");
    expect(warehouse).toContain("COUNTIF(event_name = 'purchase_pending') AS purchase_pendings");
    expect(warehouse).toContain("'purchase_completed', 'purchase_pending', 'purchase_failed'");
    expect(governance.events.some((event) => event.name === 'purchase_pending')).toBe(true);
    expect(governance.metrics.find((metric) => metric.id === 'conversion.behavioral_funnel.v1')?.events)
      .toContain('purchase_pending');
  });
});
