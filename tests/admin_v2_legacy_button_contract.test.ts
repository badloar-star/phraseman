import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Admin v2 legacy access button', () => {
  const shell = read('admin/v2/index.html');
  const styles = read('admin/v2/styles/admin.css');

  it('opens the preserved legacy admin safely from the global top bar', () => {
    const topbarIndex = shell.indexOf('<div class="topbar-actions">');
    const legacyLinkIndex = shell.indexOf('class="legacy-admin-link"', topbarIndex);
    const supportLinkIndex = shell.indexOf('href="#support"', topbarIndex);

    expect(topbarIndex).toBeGreaterThanOrEqual(0);
    expect(legacyLinkIndex).toBeGreaterThan(topbarIndex);
    expect(legacyLinkIndex).toBeLessThan(supportLinkIndex);
    expect(shell).toContain('href="/legacy.html"');
    expect(shell).toContain('target="_blank"');
    expect(shell).toContain('rel="noopener"');
    expect(shell).toContain('<span class="legacy-admin-link-label">Старая админка</span>');
    expect(shell).toContain('aria-label="Открыть старую админку в новой вкладке"');
    expect(shell).toContain('data-tooltip="Открыть старую админку в новой вкладке — для функций, которых ещё нет в Admin 2"');
  });

  it('keeps a 44px warning-styled control visible on narrow screens', () => {
    expect(styles).toMatch(/\.topbar-actions \.legacy-admin-link\s*\{[^}]*min-height:\s*44px;[^}]*background:\s*var\(--warning-soft\);/s);
    expect(styles).toMatch(/\.topbar-actions \.legacy-admin-link\[data-tooltip\]::after\s*\{[^}]*top:\s*calc\(100% \+ 8px\);[^}]*bottom:\s*auto;[^}]*right:\s*0;[^}]*left:\s*auto;/s);

    const mobileStart = styles.indexOf('@media (max-width: 760px)');
    const mobileEnd = styles.indexOf('@media (max-width: 420px)');
    const mobile = styles.slice(mobileStart, mobileEnd);

    expect(mobileStart).toBeGreaterThanOrEqual(0);
    expect(mobileEnd).toBeGreaterThan(mobileStart);
    expect(mobile).toMatch(/\.topbar-actions \.legacy-admin-link\s*\{[^}]*display:\s*inline-flex;[^}]*width:\s*44px;[^}]*padding:\s*0;[^}]*\}/s);
    expect(mobile).toContain('.legacy-admin-link-label { display: none; }');
  });
});
