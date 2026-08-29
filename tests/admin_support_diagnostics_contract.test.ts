import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '../admin/v2/legacy.html'), 'utf8');

describe('live admin support diagnostics contract', () => {
  test('renders only normalized diagnostics in a collapsed accessible timeline', () => {
    expect(source).toContain('function normalizeSupportDiagnostics(value)');
    expect(source).toContain('function renderSupportDiagnostics(value)');
    expect(source).toContain('<details class="support-diagnostics"');
    expect(source).toContain('Диагностика перед ошибкой');
    expect(source).toContain('data-copy-b64');
    expect(source).toContain('normalizeSupportDiagnostics(r.diagnostics)');
    expect(source).not.toContain('JSON.stringify(r.diagnostics)');
    expect(source).toContain('--- безопасная диагностика перед ошибкой ---');
    expect(source).toContain('const safeDiagnostics = normalizeSupportDiagnostics(r.diagnostics)');
  });

  test('escapes rendered event fields and caps the admin view', () => {
    const block = source.slice(
      source.indexOf('function normalizeSupportDiagnostics(value)'),
      source.indexOf('function renderReports(reports)'),
    );
    expect(block).toContain('.slice(-200)');
    expect(block).toContain('escapeHtml');
    expect(block).toContain('sort((a,b) => a.atMs - b.atMs)');
    expect(block).not.toContain('.innerHTML');
  });
});
