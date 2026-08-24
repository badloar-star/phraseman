import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';

const root = join(__dirname, '..');
const html = readFileSync(join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
const script = (name: string) => readFileSync(join(root, 'admin', 'v2', 'scripts', 'pages', name), 'utf8');

describe('live legacy detailed analytics integration', () => {
  test('mounts every immutable renderer DOM contract in the live analytics tab', () => {
    for (const id of [
      'product-analytics-panel', 'product-analytics-range', 'product-analytics-platform',
      'product-analytics-status', 'product-analytics-summary', 'product-analytics-sessions',
      'product-analytics-screens', 'product-analytics-lessons', 'product-analytics-learning-dropoff',
      'product-analytics-conversion', 'product-analytics-retention',
      'product-analytics-experiments', 'product-analytics-reliability', 'product-analytics-quality',
      'subscription-analytics-panel', 'subscription-analytics-range', 'subscription-analytics-store',
      'subscription-analytics-status', 'subscription-analytics-content',
    ]) expect((html.match(new RegExp(`id=["']${id}["']`, 'g')) || [])).toHaveLength(1);
    for (const key of ['instances', 'sessions', 'views', 'unknown']) {
      expect((html.match(new RegExp(`data-pa=["']${key}["']`, 'g')) || [])).toHaveLength(1);
    }
  });

  test('exposes cached protected callable bridges exactly once without direct Firestore loaders', () => {
    expect((html.match(/httpsCallable\(functionsUs, 'adminProductAnalytics'\)/g) || [])).toHaveLength(1);
    expect((html.match(/httpsCallable\(functionsUs, 'adminSubscriptionAnalytics'\)/g) || [])).toHaveLength(1);
    expect((html.match(/window\.callAdminProductAnalytics\s*=/g) || [])).toHaveLength(1);
    expect((html.match(/window\.callAdminSubscriptionAnalytics\s*=/g) || [])).toHaveLength(1);
    const from = html.indexOf('let _fnAdminProductAnalytics');
    const to = html.indexOf('let _fnAdminGetRemoteConfigWorkspace', from);
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    const bridges = html.slice(from, to);
    expect(bridges).not.toMatch(/\b(getDocs|collection|query|limit|where|orderBy)\s*\(/);
  });

  test('loads immutable renderers in dependency order and owns each loader once', () => {
    const includes = [
      'scripts/components/analytics-language.js',
      'scripts/pages/product-sessions.js',
      'scripts/pages/learning-diagnostics.js',
      'scripts/pages/conversion-diagnostics.js',
      'scripts/pages/retention-diagnostics.js',
      'scripts/pages/product-analytics.js',
      'scripts/pages/subscription-analytics.js',
    ];
    let previous = -1;
    for (const src of includes) {
      expect((html.match(new RegExp(`<script src=["']${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']><\\/script>`, 'g')) || [])).toHaveLength(1);
      const position = html.indexOf(src);
      expect(position).toBeGreaterThan(previous);
      previous = position;
    }
    expect((script('product-analytics.js').match(/window\.loadProductAnalytics\s*=(?!=)/g) || [])).toHaveLength(1);
    expect((script('subscription-analytics.js').match(/window\.loadSubscriptionAnalytics\s*=(?!=)/g) || [])).toHaveLength(1);
    expect(html).not.toMatch(/window\.loadProductAnalytics\s*=(?!=)/);
    expect(html).not.toMatch(/window\.loadSubscriptionAnalytics\s*=(?!=)/);
  });

  test('renderer bundle resolves its runtime globals once in the declared order', () => {
    const window: Record<string, unknown> = {};
    const context = {
      window,
      document: { getElementById: () => null, querySelector: () => null },
      console,
      Intl,
      Date,
      Number,
      String,
      Object,
      Array,
    };
    const files = [
      join(root, 'admin', 'v2', 'scripts', 'components', 'analytics-language.js'),
      ...['product-sessions.js', 'learning-diagnostics.js', 'conversion-diagnostics.js', 'retention-diagnostics.js', 'product-analytics.js', 'subscription-analytics.js']
        .map((name) => join(root, 'admin', 'v2', 'scripts', 'pages', name)),
    ];
    files.forEach((file) => runInNewContext(readFileSync(file, 'utf8'), context, { filename: file }));
    for (const name of [
      'AdminAnalyticsLanguage', 'renderProductSessions', 'renderLearningDiagnostics',
      'renderConversionDiagnostics', 'renderRetentionDiagnostics',
      'renderExperimentsAndReliability', 'loadProductAnalytics', 'loadSubscriptionAnalytics',
    ]) expect(window[name]).toBeDefined();
  });
});
