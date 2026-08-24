import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin analytics server boundary', () => {
  test('enforces money.read and bounded work for every analytics endpoint', () => {
    const product = read('functions/src/admin_product_analytics.ts');
    const subscription = read('functions/src/admin_subscription_analytics.ts');
    const monthly = read('functions/src/admin_monthly_decision_pack.ts');
    const monthlyZip = read('functions/src/monthly_decision_pack_zip.ts');

    expect(product).toContain("hasVerifiedCallablePermission(request.auth, 'money.read')");
    expect(product).toContain("new HttpsError('permission-denied'");
    expect(product).toContain('clampProductAnalyticsDays(request.data?.rangeDays)');
    expect(product).toContain("console.info('admin_product_analytics authorized'");

    expect(subscription).toContain("hasVerifiedCallablePermission(request.auth, 'money.read')");
    expect(subscription).toContain("new HttpsError('permission-denied'");
    expect(subscription).toContain('while (rows.length < DOCUMENT_CAP)');
    expect(subscription).toContain("console.info('admin_subscription_analytics authorized'");

    expect(monthly).toContain('dependencies.hasPermission(auth)');
    expect(monthly).toContain("hasVerifiedCallablePermission(auth, 'money.read')");
    expect(monthly).toContain("new HttpsError('permission-denied'");
    expect(monthly).toContain('createDecisionPackZip(files)');
    expect(monthly).toContain("console.info('admin_monthly_decision_pack authorized'");
    expect(monthlyZip).toContain('DECISION_PACK_ZIP_LIMIT_BYTES');

    for (const source of [product, subscription, monthly]) {
      const authorizedLog = source.slice(source.indexOf("console.info('admin_"), source.indexOf("console.info('admin_") + 500);
      expect(authorizedLog).not.toMatch(/uid|email|payload|request\.data/);
    }
  });

  test('keeps explicit non-admin regression coverage beside the server handlers', () => {
    const permissionBoundaryTest = read('functions/src/admin_analytics_permission_boundary.test.ts');
    const monthlyTest = read('functions/src/admin_monthly_decision_pack.test.ts');

    expect(permissionBoundaryTest).toContain("adminRole: 'support'");
    expect(permissionBoundaryTest).toContain('handleAdminProductAnalytics');
    expect(permissionBoundaryTest).toContain('handleAdminSubscriptionAnalytics');
    expect(permissionBoundaryTest).toContain("code: 'permission-denied'");
    expect(monthlyTest).toContain("code: 'permission-denied'");
  });
});
