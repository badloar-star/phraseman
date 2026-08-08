import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('release and reliability evidence contract', () => {
  it('instruments a real bounded operation failure after paywall inventory retries', () => {
    const source = read('app/paywall_purchase.ts');
    expect(source).toContain("trackProductOperationFailure('paywall', 'offerings_load', 'store_unavailable', true)");
  });

  it('reports adoption and bounded failures while leaving unsupported native health unavailable', () => {
    const source = read('functions/src/admin_product_analytics.ts');
    expect(source).toContain("'release_adoption' AS row_kind");
    expect(source).toContain("'operation_failure' AS row_kind");
    expect(source).toContain("crashFreeUsers: 'unavailable_no_crashlytics_aggregate_export'");
    expect(source).toContain("crashFreeSessions: 'unavailable_no_crashlytics_aggregate_export'");
    expect(source).toContain("anrRate: 'unavailable_no_crashlytics_aggregate_export'");
    expect(source).not.toContain('crashFreeUsers: 1');
  });
});
