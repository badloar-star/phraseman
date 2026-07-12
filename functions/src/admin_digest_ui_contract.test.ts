import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
const digestModulePath = path.join(ROOT, 'admin', 'admin-digest.js');
const pmModulePath = path.join(ROOT, 'admin', 'admin-product-manager.js');

describe('admin digest v2 surface', () => {
  test('loads a focused digest module and exposes accessible v2 regions', () => {
    expect(fs.existsSync(digestModulePath)).toBe(true);
    expect(adminHtml).toContain('admin-digest.js');
    expect(adminHtml).toContain('id="dd-period"');
    expect(adminHtml).toContain('id="dd-kpis"');
    expect(adminHtml).toContain('id="dd-charts"');
    expect(adminHtml).toContain('id="dd-coverage"');
    expect(adminHtml).toContain('id="dd-history"');
  });

  test('keeps one primary generation action and labels data regions', () => {
    expect((adminHtml.match(/id="dd-generate"/g) || [])).toHaveLength(1);
    expect(adminHtml).toContain('aria-label="Период дайджеста"');
    expect(adminHtml).toContain('aria-label="Сравнительные показатели"');
    expect(adminHtml).toContain('aria-label="Графики дайджеста"');
    expect(adminHtml).toContain('aria-label="Покрытие источников"');
  });

  test('renders zero, unknown and partial as distinct states', () => {
    const digestModule = fs.readFileSync(digestModulePath, 'utf8');
    expect(digestModule).toContain("status === 'partial'");
    expect(digestModule).toContain("status === 'failed'");
    expect(digestModule).toContain('Н/Д');
    expect(digestModule).toContain('Нет событий');
  });

  test('explains legacy digest documents instead of asking for a manual period', () => {
    const digestModule = fs.readFileSync(digestModulePath, 'utf8');
    expect(digestModule).toContain('Старый формат дайджеста');
    expect(digestModule).toContain('Сформировать дайджест');
    expect(digestModule).toContain('promptVersion');
    expect(digestModule).toContain('создан старым промптом');
  });

  test('shows human source names first and translates technical coverage statuses', () => {
    const digestModule = fs.readFileSync(digestModulePath, 'utf8');
    expect(digestModule).toContain('SOURCE_LABELS');
    expect(digestModule).toContain('sourceLabel(source)');
    expect(digestModule).toContain('Не сравнивается');
  });

  test('callable response includes source coverage diagnostics', () => {
    const digestSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'admin_daily_digest.ts'), 'utf8');
    expect(digestSource).toMatch(/return \{\s*ok: true,[\s\S]{0,800}sourceCoverage/);
  });

  test('records the real tab opening and generates from the previous opening', () => {
    const digestSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'admin_daily_digest.ts'), 'utf8');
    expect(digestSource).toContain('export const adminOpenDailyDigest');
    expect(digestSource).toContain('lastOpenedAtMs');
    expect(digestSource).toContain('pendingWindowStartMs');
    expect(adminHtml).toContain("httpsCallable(functionsUs, 'adminOpenDailyDigest')");
    expect(adminHtml).toContain('registerDailyDigestOpen');
  });
});

describe('admin Product Manager Workspace surface', () => {
  test('loads a focused Product Manager module and exposes six workspace regions', () => {
    expect(fs.existsSync(pmModulePath)).toBe(true);
    expect(adminHtml).toContain('admin-product-manager.js');
    for (const id of ['pm-overview', 'pm-metrics', 'pm-opportunities', 'pm-experiments', 'pm-decisions', 'pm-coverage']) {
      expect(adminHtml).toContain(`id="${id}"`);
    }
  });

  test('keeps one primary PM generation action and accessible chart tables', () => {
    expect((adminHtml.match(/id="pm-generate"/g) || [])).toHaveLength(1);
    const pmModule = fs.readFileSync(pmModulePath, 'utf8');
    expect(pmModule).toContain('pm-data-table');
    expect(pmModule).toContain('adminGenerateProductBrief');
    expect(pmModule).toContain('adminMutateProductItem');
  });

  test('renders human metric and source names before technical identifiers', () => {
    const pmModule = fs.readFileSync(pmModulePath, 'utf8');
    expect(pmModule).toContain('SOURCE_LABELS');
    expect(pmModule).toContain('METRIC_LABELS');
    expect(pmModule).toContain('sourceLabel(sourceId)');
    expect(pmModule).toContain('metricLabel(m.metricId)');
    expect(pmModule).not.toContain("'<tr><td>' + text(sourceId) + '</td>'");
  });

  test('does not interpolate model ids into inline JavaScript handlers', () => {
    const pmModule = fs.readFileSync(pmModulePath, 'utf8');
    expect(pmModule).not.toContain('onclick="pmMutateItem');
    expect(pmModule).toContain('data-pm-action');
    expect(pmModule).toContain('addEventListener');
  });
});
