import fs from 'node:fs';
import path from 'node:path';

const core = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'styles', 'admin.css'), 'utf8');

describe('Admin v2 tonal container system', () => {
  test('uses borderless tonal surfaces as the global card hierarchy', () => {
    expect(styles).toContain('--surface-section: #eef2f5;');
    expect(styles).toContain('.card { border: 0;');
    expect(styles).toContain('.card-header {');
    expect(styles).toContain('border-bottom: 0;');
    expect(styles).toContain('.list-row {');
    expect(styles).toContain('.tonal-row,');
    expect(styles).toContain('.tonal-row,');
    expect(styles).not.toContain('.capability-grid');
    expect(core).not.toContain('renderCapabilityHub');
    expect(styles).not.toContain('gap: 1px; padding: 1px; background: var(--line);');
    expect(styles).not.toContain('border-bottom: 1px solid #edf0f3;');
    expect(styles).not.toContain('border-top: 1px solid #edf0f3;');
    expect(styles).not.toContain('.profile-source { padding: 14px 16px; border-top: 1px solid var(--line); }');
  });

  test('gives report rows a visible status tone plus a textual status', () => {
    expect(core).toContain('reportToneClass(item.lane)');
    expect(core).toContain('report-card tone-${reportToneClass(item.lane)}');
    expect(styles).toContain('.report-card.tone-open');
    expect(styles).toContain('.report-card.tone-answered');
    expect(styles).toContain('.report-card.tone-resolved');
  });

  test('automatically refreshes the queue when report filters change', () => {
    expect(core).toContain("document.addEventListener('change', handleReportFilterChange)");
    expect(core).toContain("document.addEventListener('input', handleReportFilterInput)");
    expect(core).toContain('applyReportFiltersAndLoad');
    expect(core).toContain('Автообновление включено');
    expect(core).not.toContain('>Загрузить</button>\n    </div></div></section>');
  });
});
