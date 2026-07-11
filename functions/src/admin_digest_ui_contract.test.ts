import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
const digestModulePath = path.join(ROOT, 'admin', 'admin-digest.js');

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
  });

  test('callable response includes source coverage diagnostics', () => {
    const digestSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'admin_daily_digest.ts'), 'utf8');
    const returnBlock = digestSource.slice(digestSource.lastIndexOf('return {'), digestSource.lastIndexOf('} catch (error)'));
    expect(returnBlock).toContain('sourceCoverage');
  });
});
