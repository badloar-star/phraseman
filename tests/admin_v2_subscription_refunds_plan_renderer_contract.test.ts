import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 subscription-refunds plan renderer', () => {
  const view = read('admin/v2/scripts/admin-analytics-view.js');
  const subscriptions = read('admin/v2/scripts/pages/subscription-analytics.js');

  test('wires the model callback to the detailed subscriptions renderer without exposing a fallback CTA', () => {
    expect(view).toContain('globalThis.AdminV2RenderAnalyticsPlanAction = typeof model.renderPlanAction === \'function\' ? model.renderPlanAction : undefined;');
    expect(subscriptions).toContain('window.AdminV2RenderAnalyticsPlanAction?.(refundPlanSignal)');
    expect(subscriptions).toContain('!m.truncated && Number(m.undatedEvents) === 0 && Number(m.refunds) > 0');
    expect(subscriptions).toContain('Number.isFinite(Number(data.dataThroughMs))');
  });

  test('keeps incomplete subscription data and non-refund cards out of the plan CTA path', () => {
    const refundBlock = subscriptions.slice(subscriptions.indexOf('const refundPlanSignal'), subscriptions.indexOf('content.innerHTML'));
    expect(refundBlock).toContain("state: 'ready'");
    expect(refundBlock).toContain("source: 'revenuecat_subscription_analytics'");
    expect(refundBlock).not.toContain('summary');
    expect(refundBlock).not.toContain('email');
    expect(refundBlock).not.toContain('uid');
  });

  test('hydrates a prelinked refunds fixture before rendering so its CTA is suppressed without a click', () => {
    expect(view).toContain('globalThis.AdminV2HydrateAnalyticsPlanAction = typeof model.hydratePlanAction === \'function\' ? model.hydratePlanAction : undefined;');
    const hydrateBeforeRender = subscriptions.slice(subscriptions.indexOf('const refundPlanSignal'), subscriptions.indexOf('content.innerHTML'));
    expect(hydrateBeforeRender).toContain('await window.AdminV2HydrateAnalyticsPlanAction?.(refundPlanSignal);');
    expect(hydrateBeforeRender.indexOf('await window.AdminV2HydrateAnalyticsPlanAction?.(refundPlanSignal);')).toBeLessThan(hydrateBeforeRender.indexOf('const refundPlanAction'));
  });
});
