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
    // зачем (Ядро 15.10, D187): retired — событие удалённой фичи, хранится ради истории склада; вызова у него нет и быть не может
    expect(report.summary.called + report.summary.retired).toBe(report.summary.declared);
    // зачем (координатор 00:02, 11.10): события с warehouse "telemetry_only" (Learning V2 до его включения) на склад
    // не идут — склад и метрики считаются без них. Вернуть V2 на склад: warehouse "product" + SQL + метрика.
    const governance = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app/product_analytics_governance.json'), 'utf8')) as {
      events: Array<{ name: string; warehouse: string }>;
    };
    const telemetryOnly = governance.events.filter(event => event.warehouse === 'telemetry_only').map(event => event.name).sort();
    expect(telemetryOnly).toEqual([
      'learning_v2_session_abandon', 'learning_v2_session_complete', 'learning_v2_session_start', 'learning_v2_task_result',
    ]);
    expect(report.summary.warehoused).toBe(report.summary.declared - telemetryOnly.length);
    expect(report.summary.measured).toBe(report.summary.declared - telemetryOnly.length);
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
