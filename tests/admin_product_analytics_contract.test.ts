import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Admin v2 product analytics contract', () => {
  it('keeps product analytics inside the existing Analytics tab', () => {
    const html = read('admin/v2/scripts/admin-core.js');
    for (const id of ['product-analytics-panel', 'product-analytics-screens', 'product-analytics-lessons', 'product-analytics-learning-dropoff', 'product-analytics-conversion', 'product-analytics-retention', 'product-analytics-quality', 'product-analytics-sessions']) {
      expect(html).toContain(`id="${id}"`);
    }
    for (const script of ['analytics-language', 'product-analytics', 'product-sessions', 'learning-diagnostics', 'conversion-diagnostics', 'retention-diagnostics']) {
      expect(read('admin/v2/index.html')).toContain(script);
    }
    const product = read('admin/v2/scripts/pages/product-analytics.js');
    expect(product).toContain('window.callAdminProductAnalytics');
    expect(product).toContain('Данные по ');
    const sessions = read('admin/v2/scripts/pages/product-sessions.js');
    expect(sessions).toContain('Последний наблюдаемый экран');
    expect(sessions).toContain('не доказывает закрытие или удаление приложения');
    const learning = read('admin/v2/scripts/pages/learning-diagnostics.js');
    expect(learning).toContain('window.renderLearningDiagnostics');
    expect(learning).toContain('Доля ответов с детализацией');
    expect(learning).toContain('Доля данных с детализацией');
    expect(learning).toContain('Доля ошибок');
    const conversion = read('admin/v2/scripts/pages/conversion-diagnostics.js');
    expect(conversion).toContain('window.renderConversionDiagnostics');
    expect(conversion).toContain('Путь внутри приложения');
    expect(conversion).toContain('RevenueCat');
    expect(conversion).toContain('У половины до главной кнопки');
    expect(conversion).toContain('Готовность магазина и тарифов');
    expect(conversion).toContain('Возможна блокировка главной кнопки');
    expect(conversion).toContain('inventoryReadiness');
    expect(conversion).toContain('У 90% загрузка заняла');
    const retention = read('admin/v2/scripts/pages/retention-diagnostics.js');
    expect(retention).toContain('window.renderRetentionDiagnostics');
    expect(retention).toContain('первой наблюдаемой сессии');
    expect(retention).toContain('не доказывает установку или удаление приложения');
    expect(retention).toContain("value != null && value !== ''");
    expect(html).toContain('Установки приложения');
  });

  it('discloses consent coverage instead of presenting the sample as all users', () => {
    const html = read('admin/v2/scripts/admin-core.js');
    expect(html).toContain('только по событиям пользователей, разрешивших аналитику');
    expect(html).toContain('Установка приложения не равна уникальному человеку');
  });

  it('exports an admin-only aggregate callable', () => {
    const callable = read('functions/src/admin_product_analytics.ts');
    const index = read('functions/src/index.ts');
    expect(callable).toContain("hasClaimedPermission(request.auth?.token, 'money.read')");
    expect(callable).toContain("new HttpsError('permission-denied'");
    expect(callable).toContain('ANALYTICS_BIGQUERY_DATASET');
    expect(callable).toContain('dataThroughMs');
    expect(callable).toContain('consented_app_instances');
    expect(index).toContain("export { adminProductAnalytics } from './admin_product_analytics';");
  });

  it('renders isolated Production/Test soft funnels with complete loss and outcome diagnostics', () => {
    const html = read('admin/v2/scripts/admin-core.js');
    const product = read('admin/v2/scripts/pages/product-analytics.js');
    const callable = read('functions/src/admin_product_analytics.ts');
    expect(html).toContain('id="product-analytics-soft-upsells"');
    for (const field of [
      'soft_cta_rate', 'dismiss_rate', 'pending_purchases', 'paid_activations', 'failures',
      'cancellations', 'continue_free', 'trial_rate', 'cta_to_purchase_rate',
      'eligible_to_impression_rate', 'paywall_close_rate', 'continue_free_rate',
      'monthly_activations', 'yearly_activations', 'lifetime_activations',
      'median_impression_to_cta_ms', 'median_impression_to_result_ms',
    ]) expect(product).toContain(field);
    expect(product).toContain('data-soft-mode');
    expect(product).toContain('_productAnalyticsSoftMode');
    expect(product).toContain("selectedMode === 'test'");
    expect(product).toContain('RevenueCat');
    for (const quality of [
      'rejected_chain_ids', 'conflicting_chain_ids', 'cta_without_impression',
      'paywall_without_soft_cta', 'outcome_without_purchase_start', 'partial_open_chains',
    ]) {
      expect(product).toContain(quality);
      expect(callable).toContain(quality);
    }
  });
});
