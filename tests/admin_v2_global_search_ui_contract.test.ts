import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');

describe('Admin v2 global navigation search', () => {
  test('uses only visible navigation metadata with an accessible dialog and no data actions', () => {
    expect(core).toContain("from './admin-v2-global-search.js'");
    expect(core).toContain('buildVisibleNavigationSearchIndex');
    expect(core).toContain('global-search-launcher');
    expect(core).toContain('global-search-dialog');
    expect(core).toContain('role="listbox"');
    expect(core).toContain('aria-label="Поиск разделов и инструментов"');
    expect(core).toContain('data-global-search-route');
    expect(core).not.toContain('data-action="global-search');
  });

  test('keeps keyboard navigation local, debounced and cancellable', () => {
    expect(core).toContain("event.key.toLowerCase() === 'k'");
    expect(core).toContain("event.key === '/'");
    expect(core).toContain("event.key === 'Escape'");
    expect(core).toContain("event.key === 'ArrowDown'");
    expect(core).toContain("event.key === 'ArrowUp'");
    expect(core).toContain("event.key === 'Enter'");
    expect(core).toContain('setTimeout');
    expect(core).toContain('220');
    expect(core).toContain('createQueryCancellation');
  });

  test('restores search focus only to a live visible target, otherwise uses the drawer or desktop fallback and clears it', () => {
    expect(core).toContain('function restoreGlobalSearchFocus()');
    expect(core).toContain('function isRestorableGlobalSearchFocus(element)');
    expect(core).toContain('element.isConnected');
    expect(core).toContain('element.getClientRects().length > 0');
    expect(core).toContain("!element.matches(':disabled')");
    expect(core).toContain("element.closest('[aria-hidden=\"true\"], [inert]')");
    expect(core).toContain("const fallbacks = document.body.classList.contains('nav-open') ? [toggle, ...mobileNavFocusableElements()] : [launcher, toggle];");
    expect(core).toContain('const target = [returnFocus, ...fallbacks].find(isRestorableGlobalSearchFocus);');
    const restore = core.slice(core.indexOf('function restoreGlobalSearchFocus()'));
    expect(restore.indexOf('globalSearchReturnFocus = null;')).toBeLessThan(restore.indexOf('.focus({ preventScroll: true })'));
    expect(restore).not.toContain('document.body.focus(');
    expect(core).toContain("dialog?.addEventListener('close', restoreGlobalSearchFocus)");
  });
});
