import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Admin v2 legacy access button', () => {
  const shell = read('admin/v2/index.html');
  const styles = read('admin/v2/styles/admin.css');

  it('keeps the preserved legacy admin as the final navigation escape hatch', () => {
    const footerIndex = shell.indexOf('<div class="sidebar-footer">');
    const legacyLinkIndex = shell.indexOf('class="legacy-admin-link"', footerIndex);
    const topbarIndex = shell.indexOf('<div class="topbar-actions">');

    expect(footerIndex).toBeGreaterThanOrEqual(0);
    expect(legacyLinkIndex).toBeGreaterThan(footerIndex);
    expect(topbarIndex).toBeGreaterThan(legacyLinkIndex);
    expect(shell).toContain('href="/legacy.html"');
    expect(shell).toContain('target="_blank"');
    expect(shell).toContain('rel="noopener"');
    expect(shell).toContain('<span class="legacy-admin-link-label">Старая админка</span>');
    expect(shell).toContain('aria-label="Открыть старую админку в новой вкладке"');
    expect(shell).toContain('data-tooltip="Открыть сохранённые рабочие инструменты старой админки в новой вкладке"');
  });

  it('keeps a 44px dark-navigation control visible on narrow screens', () => {
    expect(styles).toMatch(/\.sidebar-footer \.legacy-admin-link\s*\{[^}]*min-height:\s*44px;[^}]*background:\s*#2b2418;/s);
    expect(styles).toContain('@media (max-width: 760px)');
    expect(styles).toContain('.sidebar-footer .legacy-admin-link-label');
  });
});
