import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 read-only analytics workspace', () => {
  test('mounts product, subscription and monthly views without destructive controls', () => {
    const app = read('admin/v2/scripts/admin-analytics-app.js');
    const index = read('admin/v2/index.html');

    for (const id of [
      'monthly-decision-pack-panel',
      'monthly-decision-pack-download',
      'product-analytics-panel',
      'product-analytics-sessions',
      'product-analytics-screens',
      'product-analytics-lessons',
      'product-analytics-learning-dropoff',
      'product-analytics-learning-outcomes',
      'product-analytics-conversion',
      'product-analytics-retention',
      'product-analytics-experiments',
      'product-analytics-reliability',
      'product-analytics-quality',
      'subscription-analytics-panel',
      'subscription-analytics-content',
    ]) {
      expect(app).toContain(`id="${id}"`);
    }
    expect(app.match(/id="product-analytics-retention"/g)).toHaveLength(1);

    for (const script of [
      'analytics-language.js',
      'product-analytics.js',
      'product-sessions.js',
      'learning-diagnostics.js',
      'conversion-diagnostics.js',
      'retention-diagnostics.js',
      'subscription-analytics.js',
      'monthly-decision-pack.js',
    ]) {
      expect(index).toContain(script);
    }
    expect(`${index}\n${app}`).not.toMatch(/data-action="(?:publish|send|delete|dispatch|activate|rollback)|Отправить|Удалить|Опубликовать/);
  });

  test('uses server callables only and keeps aggregate privacy explanations visible', () => {
    const productPage = read('admin/v2/scripts/pages/product-analytics.js');
    const subscriptionPage = read('admin/v2/scripts/pages/subscription-analytics.js');
    const monthlyPage = read('admin/v2/scripts/pages/monthly-decision-pack.js');
    const app = read('admin/v2/scripts/admin-analytics-app.js');

    expect(productPage).toContain('window.callAdminProductAnalytics');
    expect(subscriptionPage).toContain('window.callAdminSubscriptionAnalytics');
    expect(monthlyPage).toContain('window.callAdminMonthlyDecisionPack');
    expect(`${productPage}\n${subscriptionPage}\n${monthlyPage}`).not.toMatch(/\bgetDocs\s*\(|firebase-firestore/);
    expect(app).toContain('разрешивших аналитику');
    expect(app).toContain('не равна уникальному человеку');
    expect(app).toContain('Сырые события, тексты и идентификаторы пользователей не включаются');
  });

  test('all three backend callables enforce the server-side money.read boundary', () => {
    const product = read('functions/src/admin_product_analytics.ts');
    const subscription = read('functions/src/admin_subscription_analytics.ts');
    const monthly = read('functions/src/admin_monthly_decision_pack.ts');

    expect(product).toContain('hasProductAnalyticsAuth(request.auth)');
    expect(product).toContain("new HttpsError('permission-denied'");
    expect(subscription).toContain("hasVerifiedCallablePermission(request.auth, 'money.read')");
    expect(subscription).toContain("new HttpsError('permission-denied'");
    expect(monthly).toContain("hasVerifiedCallablePermission(auth, 'money.read')");
    expect(monthly).toContain("new HttpsError('permission-denied'");
  });

  test('installs safe callable adapters before asynchronous Firebase startup', () => {
    const app = read('admin/v2/scripts/admin-analytics-app.js');
    const installIndex = app.indexOf('installUnavailableCallableAdapters();');
    const firebaseBootIndex = app.indexOf('createAnalyticsAdminActions({ onAuth })');

    expect(installIndex).toBeGreaterThan(-1);
    expect(firebaseBootIndex).toBeGreaterThan(installIndex);
    for (const callable of [
      'callAdminProductAnalytics',
      'callAdminSubscriptionAnalytics',
      'callAdminMonthlyDecisionPack',
    ]) {
      expect(app).toContain(`globalThis.${callable} = unavailableCallable;`);
    }
  });
});
