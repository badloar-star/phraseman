import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin analytics server boundary', () => {
  test('enforces money.read and records bounded access for every analytics endpoint', () => {
    const product = read('functions/src/admin_product_analytics.ts');
    const subscription = read('functions/src/admin_subscription_analytics.ts');
    const monthly = read('functions/src/admin_monthly_decision_pack.ts');

    expect(product).toContain('hasProductAnalyticsAuth(request.auth)');
    expect(product).toContain("new HttpsError('permission-denied'");
    expect(product).toContain("console.info('admin_product_analytics authorized'");

    expect(subscription).toContain("hasVerifiedCallablePermission(request.auth, 'money.read')");
    expect(subscription).toContain("new HttpsError('permission-denied'");
    expect(subscription).toContain("console.info('admin_subscription_analytics authorized'");
    expect(subscription).toContain('while (rows.length < DOCUMENT_CAP)');

    expect(monthly).toContain("hasVerifiedCallablePermission(auth, 'money.read')");
    expect(monthly).toContain("new HttpsError('permission-denied'");
    expect(monthly).toContain("console.info('admin_monthly_decision_pack authorized'");
    expect(monthly).toContain('DECISION_PACK_ZIP_LIMIT_BYTES');
  });

  test('keeps explicit non-admin regression coverage beside the server handlers', () => {
    const productTest = read('functions/src/admin_product_analytics.test.ts');
    const subscriptionTest = read('functions/src/admin_subscription_analytics.test.ts');
    const monthlyTest = read('functions/src/admin_monthly_decision_pack.test.ts');

    expect(productTest).toContain("adminRole: 'support'");
    expect(productTest).toContain('hasProductAnalyticsAuth');
    expect(subscriptionTest).toContain("uid: 'ordinary-user'");
    expect(subscriptionTest).toContain("code: 'permission-denied'");
    expect(monthlyTest).toContain("code: 'permission-denied'");
  });
});
