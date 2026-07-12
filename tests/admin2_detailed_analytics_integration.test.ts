import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Admin 2 detailed analytics integration', () => {
  const renderers = [
    'product-analytics.js', 'product-sessions.js', 'learning-diagnostics.js',
    'conversion-diagnostics.js', 'retention-diagnostics.js', 'subscription-analytics.js',
  ];

  it('owns every detailed analytics renderer inside Admin 2', () => {
    const shell = read('admin/v2/index.html');
    expect(shell).toContain('/v2/scripts/components/analytics-language.js');
    for (const renderer of renderers) {
      const file = `admin/v2/scripts/pages/${renderer}`;
      expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
      expect(shell).toContain(`/v2/scripts/pages/${renderer}`);
    }
  });

  it('mounts the detailed views only on the Admin 2 analytics route', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const legacy = read('admin/legacy.html');
    for (const id of [
      'product-analytics-panel', 'product-analytics-sessions', 'product-analytics-screens',
      'product-analytics-lessons', 'product-analytics-learning-dropoff',
      'product-analytics-conversion', 'product-analytics-retention',
      'product-analytics-quality', 'subscription-analytics-panel', 'subscription-analytics-content',
    ]) {
      expect(core).toContain(`id="${id}"`);
      expect(legacy).not.toContain(`id="${id}"`);
    }
  });

  it('connects both admin-only detailed analytics callables through the modular Firebase bridge', () => {
    const bridge = read('admin/v2/scripts/admin-firebase.js');
    expect(bridge).toContain("httpsCallable(functionsUs, 'adminProductAnalytics')");
    expect(bridge).toContain("httpsCallable(functionsUs, 'adminSubscriptionAnalytics')");
    expect(bridge).toContain('loadProductAnalytics:');
    expect(bridge).toContain('loadSubscriptionAnalytics:');
  });
});
