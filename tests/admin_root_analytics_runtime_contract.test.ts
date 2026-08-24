import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(__dirname, '..');
const adminRoot = path.join(root, 'admin', 'v2');
const scripts = [
  'scripts/components/analytics-language.js',
  'scripts/pages/product-sessions.js',
  'scripts/pages/learning-diagnostics.js',
  'scripts/pages/conversion-diagnostics.js',
  'scripts/pages/retention-diagnostics.js',
  'scripts/pages/product-analytics.js',
  'scripts/pages/subscription-analytics.js',
  'daily-digest.js',
];

type StubElement = {
  value?: string;
  textContent: string;
  innerHTML: string;
  style: Record<string, string>;
  disabled?: boolean;
  setAttribute: jest.Mock;
  querySelector?: jest.Mock;
  querySelectorAll?: jest.Mock;
};

function makeElement(value?: string): StubElement {
  return {
    value,
    textContent: '',
    innerHTML: '',
    style: {},
    setAttribute: jest.fn(),
  };
}

function createRuntime() {
  const elements = new Map<string, StubElement>();
  const styles = new Set<string>();
  const document = {
    head: {
      appendChild(node: { id?: string }) {
        if (node.id) styles.add(node.id);
      },
    },
    createElement: () => ({ id: '', textContent: '' }),
    getElementById: (id: string) => elements.get(id) || (styles.has(id) ? {} : null),
    querySelector: (selector: string) => elements.get(selector) || null,
  };
  const context: Record<string, unknown> = {
    console,
    document,
    setTimeout,
    clearTimeout,
    Date,
    Intl,
    Map,
    Promise,
  };
  context.window = context;
  vm.createContext(context);
  return { context, elements };
}

function runScript(context: vm.Context, relativePath: string) {
  const source = fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
  vm.runInContext(source, context, { filename: relativePath });
}

describe('live admin analytics runtime', () => {
  test('every script referenced by the live admin exists inside the published surface', () => {
    const html = fs.readFileSync(path.join(adminRoot, 'legacy.html'), 'utf8');
    for (const script of scripts) {
      expect(html).toContain(`<script src="${script}"></script>`);
      expect(fs.existsSync(path.join(adminRoot, script))).toBe(true);
    }
    const allLocalScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/giu)]
      .map((match) => match[1])
      .filter((source) => !/^https?:|^\/\//u.test(source));
    for (const source of allLocalScripts) {
      const cleanPath = source.split(/[?#]/u)[0].replace(/^\//u, '');
      expect(fs.existsSync(path.join(adminRoot, cleanPath))).toBe(true);
    }
  });

  test('renderers are defined, escape untrusted values, and retain useful empty states', () => {
    const { context, elements } = createRuntime();
    scripts.slice(0, 6).forEach((script) => runScript(context, script));
    const runtime = context as any;
    expect(typeof runtime.AdminAnalyticsLanguage.esc).toBe('function');
    expect(typeof runtime.AdminAnalyticsLanguage.header).toBe('function');
    expect(typeof runtime.renderProductSessions).toBe('function');
    expect(typeof runtime.renderLearningDiagnostics).toBe('function');
    expect(typeof runtime.renderConversionDiagnostics).toBe('function');
    expect(typeof runtime.renderRetentionDiagnostics).toBe('function');
    expect(typeof runtime.renderExperimentsAndReliability).toBe('function');

    const rendered = runtime.AdminAnalyticsLanguage.header(
      '<img src=x onerror=alert(1)>',
      'Проверка безопасного текста',
    );
    expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(rendered).not.toContain('<img');
    const sessionsHost = makeElement();
    elements.set('product-analytics-sessions', sessionsHost);
    runtime.renderProductSessions({});
    expect(sessionsHost.innerHTML).toContain('Подходящих сессий нет');
  });

  test('product loader calls the bridge, renders all panels, and updates its live status', async () => {
    const { context, elements } = createRuntime();
    scripts.slice(0, 6).forEach((script) => runScript(context, script));
    const summaryNodes = new Map(['instances', 'sessions', 'views', 'unknown'].map((key) => [key, makeElement()]));
    const panel = makeElement();
    elements.set('product-analytics-panel', panel);
    for (const [key, node] of summaryNodes) {
      elements.set(`#product-analytics-summary [data-pa="${key}"]`, node);
    }
    elements.set('product-analytics-range', makeElement('28'));
    elements.set('product-analytics-platform', makeElement('android'));
    ['product-analytics-status', 'product-analytics-sessions', 'product-analytics-screens',
      'product-analytics-lessons', 'product-analytics-learning-dropoff',
      'product-analytics-conversion', 'product-analytics-retention', 'product-analytics-experiments',
      'product-analytics-reliability', 'product-analytics-quality'].forEach((id) => elements.set(id, makeElement()));

    const call = jest.fn().mockResolvedValue({ data: {
      ok: true,
      rangeDays: 28,
      platform: 'android',
      dataThroughMs: 1_800_000_000_000,
      dataLagMs: 1000,
      quality: { consented_app_instances: 10, sessions: 12, screen_views: 30, unknown_screen_views: 1, unknown_screen_rate: 1 / 30 },
      sessions: { observed: 12, buckets: [], entryScreens: [], lastObservedScreens: [] },
      screens: [{ screen_id: 'home', views: 30 }],
      lessons: [{ lesson_id: 1, starts: 5, completes: 4 }],
      learningDropoff: {},
      behavioralConversion: {},
      activation: {},
      trueRetention: {},
      observedReturn: {},
      acquisition: {},
      experiments: { exposures: [] },
      reliability: { releaseAdoption: [], operationFailures: [] },
    } });
    (context as any).callAdminProductAnalytics = call;

    await (context as any).loadProductAnalytics(true);
    expect(call).toHaveBeenCalledWith({ rangeDays: 28, platform: 'android' });
    expect(elements.get('product-analytics-screens')?.innerHTML).toContain('Главная');
    expect(elements.get('product-analytics-status')?.textContent).toContain('период 28 дней');
    expect(summaryNodes.get('instances')?.textContent).toBe('10');

    await (context as any).loadProductAnalytics(false);
    expect(call).toHaveBeenCalledTimes(1);
  });

  test('product loader preserves visible data and releases the request lock after a network error', async () => {
    const { context, elements } = createRuntime();
    scripts.slice(0, 6).forEach((script) => runScript(context, script));
    const panel = makeElement();
    elements.set('product-analytics-panel', panel);
    elements.set('product-analytics-range', makeElement('28'));
    elements.set('product-analytics-platform', makeElement('all'));
    elements.set('product-analytics-status', makeElement());
    const existing = makeElement();
    existing.innerHTML = '<p>Старые данные</p>';
    elements.set('product-analytics-screens', existing);
    elements.set('product-analytics-lessons', makeElement());
    elements.set('product-analytics-quality', makeElement());
    (context as any).callAdminProductAnalytics = jest.fn().mockRejectedValue(new Error('network unavailable'));

    await expect((context as any).loadProductAnalytics(true)).resolves.toBeUndefined();
    expect(existing.innerHTML).toBe('<p>Старые данные</p>');
    expect(elements.get('product-analytics-status')?.textContent).toContain('Не удалось загрузить');
    expect((context as any)._productAnalyticsLoading).toBe(false);
  });

  test('subscription loader renders RevenueCat metrics and decision-grade warnings', async () => {
    const { context, elements } = createRuntime();
    runScript(context, scripts[0]);
    runScript(context, scripts[6]);
    const panel = makeElement();
    elements.set('subscription-analytics-panel', panel);
    elements.set('subscription-analytics-range', makeElement('90'));
    elements.set('subscription-analytics-store', makeElement('PLAY_STORE'));
    elements.set('subscription-analytics-status', makeElement());
    elements.set('subscription-analytics-content', makeElement());
    const call = jest.fn().mockResolvedValue({ data: {
      rangeDays: 90,
      store: 'PLAY_STORE',
      dataThroughMs: 1_800_000_000_000,
      metrics: {
        purchases: 2,
        renewals: 3,
        truncated: true,
        byEventType: [],
        byProduct: [{ id: '<bad>', events: 5 }], byStore: [], byCancellationReason: [],
      },
      revenue: {
        status: 'truncated_not_decision_grade',
        money: { grossRevenueUsdMicros: 9_000_000 },
        trialToPaid: {}, churn: {}, coverage: {}, monthlyRenewal: [], ltv: [],
      },
    } });
    (context as any).callAdminSubscriptionAnalytics = call;

    await (context as any).loadSubscriptionAnalytics(true);
    expect(call).toHaveBeenCalledWith({ rangeDays: 90, store: 'PLAY_STORE' });
    const html = elements.get('subscription-analytics-content')?.innerHTML || '';
    expect(html).toContain('Финансовая выборка обрезана');
    expect(html).toContain('Другой тариф');
    expect(html).not.toContain('<bad>');
    expect(elements.get('subscription-analytics-status')?.textContent).toContain('частичные данные');
    expect((context as any)._subscriptionAnalyticsLoading).toBe(false);
  });
});
