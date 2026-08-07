import fs from 'node:fs';
import path from 'node:path';

// ════════════════════════════════════════════════════════════════════════════
// admin_v2_paywall_ab_stats_contract.test.ts — панель «Статистика вариантов»
// рядом с редактором «A/B-тест пейволов» в Admin V2.
//
// Контракт фиксирует:
//   • панель рендерится в том же разделе, что и renderPaywallAbWorkflow;
//   • переключатель периода 7/30/90 дней и кнопка загрузки;
//   • чтение идёт только через actions-слой (callable adminGetPaywallVariantStats),
//     без прямого доступа браузера к Firestore;
//   • ручные SVG-графики с отдельным цветом на вариант A–G, легендой
//     «буква + понятное имя», таблицей и лидером 🏆;
//   • серверный callable: permission money.read, агрегация paywall_funnel без
//     dev-событий, честная выручка estimate/unavailable без выдуманных чисел;
//   • приложение пишет локализованную цену в purchase_completed, и правила
//     Firestore это разрешают.
// ════════════════════════════════════════════════════════════════════════════

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 paywall variant stats panel', () => {
  test('renders the stats panel in the same section as the paywall A/B workflow', () => {
    const core = read('admin/v2/scripts/admin-core.js');

    expect(core).toContain('function renderPaywallAbWorkflow()');
    expect(core).toContain('function renderPaywallAbStats()');
    expect(core).toMatch(/\$\{renderPaywallAbWorkflow\(\)\}\s+\$\{renderPaywallAbStats\(\)\}/);
    expect(core).toContain('Статистика вариантов');
    expect(core).toContain('function defaultPaywallAbStatsState()');
    expect(core).toContain('paywallAbStats: defaultPaywallAbStatsState()');
    expect(core).toContain('state.paywallAbStats = defaultPaywallAbStatsState()');
  });

  test('offers a 7/30/90 days period toggle and a manual read-only load action', () => {
    const core = read('admin/v2/scripts/admin-core.js');

    expect(core).toContain('data-action="paywall-ab-stats-range"');
    expect(core).toContain('data-range-days="${days}"');
    expect(core).toContain('[7, 30, 90].map((days)');
    expect(core).toContain('[7, 30, 90].includes(requestedRange)');
    expect(core).toContain('>${days} дней</button>');
    expect(core).toContain('data-action="load-paywall-ab-stats"');
    expect(core).toContain("action === 'load-paywall-ab-stats' || action === 'paywall-ab-stats-range'");
    expect(core).toContain('actions.getPaywallVariantStats({ rangeDays: state.paywallAbStats.rangeDays })');
    expect(core).toContain("can('money.read')");
    // Панель только читает: ни одного data-action записи внутри stats-функций.
    const statsRender = core.slice(core.indexOf('function renderPaywallAbStats()'), core.indexOf("const ONBOARDING_ENABLED_STEPS_KEY"));
    expect(statsRender).not.toContain('publishPaywallAb');
    expect(statsRender).not.toContain('publish-paywall-ab');
  });

  test('ships colorful hand-rolled SVG charts with per-variant colors, legend and table', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const css = read('admin/v2/styles/admin.css');

    expect(core).toContain('const PAYWALL_VARIANT_STATS_COLORS = Object.freeze({');
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      expect(core).toMatch(new RegExp(`${letter}: '#[0-9A-Fa-f]{6}'`));
    }
    // Семь разных цветов — не один цвет на всех.
    const colorValues = [...core.matchAll(/([A-G]): '#([0-9A-Fa-f]{6})'/g)].map((match) => match[2]);
    expect(new Set(colorValues).size).toBeGreaterThanOrEqual(7);

    expect(core).toContain('function renderPaywallAbStatsBarChart(rows)');
    expect(core).toContain('function renderPaywallAbStatsDonut(rows, mode)');
    expect(core).toContain('function renderPaywallAbStatsLegend(rows)');
    expect(core).toContain('function renderPaywallAbStatsTable(rows, revenueKind, verdict)');
    expect(core).toContain('function paywallVariantStatsRows(report)');
    expect(core).toContain('role="img"');
    expect(core).toContain('Покупки по вариантам');
    expect(core).toContain('🏆 победитель');
    expect(core).toContain('ещё не получали трафик');
    expect(core).toContain('оценка');
    expect(core).toContain('нет данных о ценах');
    // Легенда «буква + понятное имя» берёт имена из каталога вариантов.
    for (const name of ['Компакт', 'Стори', 'Атриум', 'Плитки', 'Один план', 'Честный триал', 'Приманка']) {
      expect(core).toContain(name);
    }

    expect(css).toContain('.paywall-stats-chart');
    expect(css).toContain('.paywall-stats-donut');
    expect(css).toContain('.paywall-stats-legend');
    expect(css).toContain('.paywall-stats-table');
  });

  // зачем: корона доставалась первой строке сортировки по АБСОЛЮТНЫМ покупкам и
  // без порога значимости — вариант с большей долей показов «побеждал» при худшей
  // конверсии, а 3 покупки из 20 читались так же уверенно, как 300 из 2000.
  // Владелец объявляет победителя по метрике «платящие на показ»; вердикт считает
  // сервер z-тестом. Контракт держит оба конца, чтобы ложный лидер не вернулся.
  test('crowns a winner only when the server confirmed statistical significance', () => {
    const core = read('admin/v2/scripts/admin-core.js');

    expect(core).toContain("const winner = verdict && verdict.decision === 'significant' ? verdict.winner : null;");
    expect(core).toContain('renderPaywallAbStatsTable(rows, revenueKind, verdict)');
    // Старый выбор «первый непустой по покупкам» не должен вернуться.
    expect(core).not.toContain('rows.find((row) => row.purchases > 0)');
    // Все три исхода объяснены пользователю, включая «данных мало».
    expect(core).toContain('можно катить на всех');
    expect(core).toContain('Победителя пока нет');
    expect(core).toContain('Данных ещё мало');
  });

  test('computes the verdict on the server with a two-proportion z-test', () => {
    const server = read('functions/src/admin_paywall_variant_stats.ts');

    expect(server).toContain('export function computePaywallVariantVerdict(');
    expect(server).toContain('const VERDICT_MIN_SHOWN_PER_VARIANT = 300;');
    expect(server).toContain('const VERDICT_ALPHA = 0.05;');
    expect(server).toContain('verdict: computePaywallVariantVerdict(variants),');
    // Сравнение идёт по конверсии, а не по абсолютным покупкам.
    expect(server).toContain('(b.purchases / b.shown) - (a.purchases / a.shown)');
    expect(server).toMatch(/decision: pValue < VERDICT_ALPHA \? 'significant' : 'not_significant'/);
  });

  test('wires the callable through the actions layer without browser Firestore access', () => {
    const firebase = read('admin/v2/scripts/admin-firebase.js');

    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetPaywallVariantStats')");
    expect(firebase).toContain('getPaywallVariantStats: async (input)');
    expect(firebase).not.toContain('firebase-firestore');
    expect(firebase).not.toContain("collection(db, 'paywall_funnel')");
    expect(firebase).not.toContain("collection(db, 'revenuecat_premium_events')");
  });

  test('guards the server callable with money.read and honest revenue semantics', () => {
    const server = read('functions/src/admin_paywall_variant_stats.ts');
    const index = read('functions/src/index.ts');

    expect(server).toContain('export const adminGetPaywallVariantStats = onCall(');
    expect(server).toContain("hasPermission(role, 'money.read')");
    expect(server).toContain("db.collection('paywall_funnel')");
    expect(server).toContain("db.collection('revenuecat_premium_events')");
    expect(server).toContain('doc.dev === true');
    expect(server).toContain("revenueKind: PaywallRevenueKind = anyPriceKnown ? 'estimate' : 'unavailable'");
    expect(server).toContain('PAYWALL_STATS_RANGE_DAYS = [7, 30, 90]');
    expect(server).toContain("'shown'");
    expect(server).toContain("'cta_click'");
    expect(server).toContain("'purchase_completed'");

    expect(index).toContain("export { adminGetPaywallVariantStats } from './admin_paywall_variant_stats';");
  });

  test('keeps the app-side price field whitelisted in Firestore rules', () => {
    const funnel = read('app/paywall_funnel.ts');
    const purchase = read('app/paywall_purchase.ts');
    const rules = read('firestore.rules');

    expect(funnel).toContain('price?: string | null;');
    expect(funnel).toContain('payload.price');
    expect(purchase).toContain("logPaywallFunnel('purchase_completed', { variant, context, plan: selected, price: storePriceTrim(pkg.product.priceString) || null });");

    const funnelRule = rules.slice(rules.indexOf('match /paywall_funnel/{docId}'), rules.indexOf('match /paywall_funnel/{docId}') + 1300);
    expect(funnelRule).toContain("'price'");
    expect(funnelRule).toContain('request.resource.data.price is string');
    expect(funnelRule).toContain('request.resource.data.price.size() <= 24');
    expect(funnelRule).toContain("['v1', 'v2', 'A', 'B', 'C', 'D', 'E', 'F', 'G']");
  });
});
