import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 visual UX repair contract', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const css = read('admin/v2/styles/admin.css');

  test('keeps tablet navigation labels visible until the mobile drawer breakpoint', () => {
    expect(css).toContain('@media (max-width: 1020px)');
    expect(css).toContain('.admin-shell { grid-template-columns: 236px minmax(0, 1fr); }');
    expect(css).toContain('.nav-group > summary span, .agent-office-nav span, .agent-manager-nav span { display: block; }');
    expect(css).not.toContain('.nav-group > summary span, .nav-group > summary::after, .agent-office-nav span, .agent-manager-nav span { display: none; }');
  });

  test('gives every audited action a plain-language tooltip without changing its action id', () => {
    for (const action of [
      'load-agent-manager', 'initialize-agent-manager-roster', 'transition-agent-manager-task',
      'create-agent-manager-local-runner-pairing', 'create-agent-manager-task', 'load-global-broadcasts',
      'preview-global-broadcast', 'publish-global-broadcast', 'deactivate-global-broadcasts',
      'preview-admin-premium', 'preview-admin-vip', 'preview-admin-ban', 'publish-admin-access',
      'discard-admin-access',
    ]) expect(core).toMatch(new RegExp(`data-action=\\"${action}\\"[^>]*(?:title|data-tooltip)=`));
    expect(core).toContain('data-global-search-route="${escapeHtml(entry.route || entry.nativeRoute)}" type="button" title="Открыть ${escapeHtml(entry.label)}"');
  });

  test('stacks analytics card headers and preserves 44px targets for global controls at mobile width', () => {
    expect(css).toContain('@media (max-width: 420px)');
    expect(css).toContain('.analytics-canonical-header, .analytics-canonical-header .card-header, .analytics-detail-header, .card-header:has(.badge) { display: block; }');
    expect(css).toContain('.analytics-canonical-header .badge, .analytics-detail-header .badge, .card-header > .badge { margin-top: 10px; white-space: normal; }');
    expect(css).toContain('#global-search-launcher, .auth-status .button, #mobile-nav-toggle { min-width: 44px; min-height: 44px; }');
  });
});
