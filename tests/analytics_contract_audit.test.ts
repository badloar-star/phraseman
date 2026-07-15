import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('analytics contract audit', () => {
  it('reports no unknown governed warehouse events', () => {
    const stdout = execFileSync(process.execPath, [
      path.join(process.cwd(), 'scripts/analytics-contract-audit.mjs'),
      '--json',
    ], { encoding: 'utf8' });
    const report = JSON.parse(stdout);

    expect(report.errors).toEqual([]);
    expect(report.summary.called).toBe(report.summary.declared);
    expect(report.summary.warehoused).toBe(report.summary.declared);
    expect(report.summary.measured).toBe(report.summary.declared);
    expect(report.catalogWarehouseMissingFromSql).toEqual([]);
    expect(report.declaredWithoutCallSite).toEqual([]);
    expect(report.warehousedWithoutMetric).toEqual([]);
  });

  it('uses explicit boundaries for the BigQuery event allowlist', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'functions/src/admin_product_analytics.ts'),
      'utf8',
    );

    expect(source).toContain('-- ANALYTICS_EVENT_ALLOWLIST_START');
    expect(source).toContain('-- ANALYTICS_EVENT_ALLOWLIST_END');

    const auditSource = fs.readFileSync(
      path.join(process.cwd(), 'scripts/analytics-contract-audit.mjs'),
      'utf8',
    );
    expect(auditSource).toContain("const ALLOWLIST_START = '-- ANALYTICS_EVENT_ALLOWLIST_START'");
    expect(auditSource).toContain("const ALLOWLIST_END = '-- ANALYTICS_EVENT_ALLOWLIST_END'");
    expect(auditSource).toContain("app/product_analytics_governance.json");
  });
});
