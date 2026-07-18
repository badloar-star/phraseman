import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin', 'v2', 'index.html'), 'utf8');
const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'admin', 'v2', 'styles', 'admin.css'), 'utf8');

describe('Admin v2 mobile navigation drawer', () => {
  test('provides an accessible toggle and an explicit mobile backdrop', () => {
    expect(html).toMatch(/id="mobile-nav-toggle"[\s\S]*aria-controls="primary-nav"[\s\S]*aria-expanded="false"/);
    expect(html).toContain('id="mobile-nav-backdrop"');
    expect(html).toContain('aria-controls="primary-nav"');
  });

  test('uses one helper for state, restores focus, and closes after a route click', () => {
    expect(core).toContain('function setMobileNavOpen(open, { restoreFocus = true } = {})');
    expect(core).toContain("toggle.setAttribute('aria-expanded', String(open))");
    expect(core).toContain('mobileNavReturnFocus?.focus({ preventScroll: true })');
    expect(core).toContain('setMobileNavOpen(!document.body.classList.contains(\'nav-open\'))');
    expect(core).toContain('closeMobileNav();');
  });

  test('moves focus into the drawer and isolates only background regions outside the toggle and dialog root', () => {
    expect(html).toContain('id="admin-workspace-actions"');
    expect(html).toContain('id="dialog-root"');
    expect(core).toContain('function mobileNavFocusableElements()');
    expect(core).toContain('function setMobileNavBackgroundInert(open)');
    expect(core).toContain("'admin-workspace-actions'");
    expect(core).toContain("'global-message'");
    expect(core).toContain("'app'");
    expect(core).not.toContain("const workspace = document.getElementById('admin-workspace');");
    expect(core).toContain('mobileNavBackgroundAttributes.set(target');
    expect(core).toContain('target.inert = true;');
    expect(core).toContain("target.setAttribute('aria-hidden', 'true')");
    expect(core).toContain("toggle.setAttribute('aria-label', open ?");
    expect(core).toContain('focusFirstMobileNavControl();');
    expect(core).toContain('trapMobileNavFocus(event);');
  });

  test('closes the drawer when its mobile breakpoint is left without restoring focus to the hidden toggle', () => {
    expect(core).toContain("matchMedia?.('(max-width: 760px)')");
    expect(core).toContain('closeMobileNav({ restoreFocus: false });');
  });

  test('gives global search Escape precedence and closes the drawer through Escape or its backdrop', () => {
    const searchEscape = core.indexOf("dialog.open && event.key === 'Escape'");
    const drawerEscape = core.indexOf("event.key === 'Escape' && document.body.classList.contains('nav-open')");
    expect(searchEscape).toBeGreaterThan(-1);
    expect(drawerEscape).toBeGreaterThan(searchEscape);
    expect(core).toContain("document.getElementById('mobile-nav-backdrop')?.addEventListener('click', closeMobileNav)");
  });

  test('leaves Tab handling to the native search dialog when it is open over the drawer', () => {
    const dialogTab = core.indexOf("dialog instanceof HTMLDialogElement && dialog.open && event.key === 'Tab'");
    const drawerTab = core.indexOf("event.key === 'Tab' && document.body.classList.contains('nav-open')");
    expect(dialogTab).toBeGreaterThan(-1);
    expect(drawerTab).toBeGreaterThan(dialogTab);
  });

  test('keeps drawer scrolling and reduced-motion support in the single mobile drawer rule', () => {
    expect(css).toMatch(/@media \(max-width: 760px\)[\s\S]*\.primary-nav \{[^}]*overflow-y: auto/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.sidebar, \.mobile-nav-backdrop \{[^}]*transition: none/);
  });
});
