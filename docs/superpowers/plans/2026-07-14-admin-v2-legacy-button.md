# Admin v2 Legacy Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, accessible, visually noticeable link from Admin 2 to the legacy admin without creating a second primary CTA.

**Architecture:** Keep the feature static and shell-level: the anchor lives in the existing Admin 2 top bar, while responsive and theme-aware presentation stays in the shared Admin 2 stylesheet. A focused read-only Jest contract protects the public path, new-tab security attributes, accessible guidance, and mobile visibility without touching router or Firebase code.

**Tech Stack:** Static HTML, CSS, SVG, Jest 29 with TypeScript contract tests.

---

### Task 1: Add the failing legacy-link contract

**Files:**
- Create: `tests/admin_v2_legacy_button_contract.test.ts`
- Read: `admin/v2/index.html`
- Read: `admin/v2/styles/admin.css`

- [ ] **Step 1: Create the focused contract test**

```ts
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Admin v2 legacy access button', () => {
  const shell = read('admin/v2/index.html');
  const styles = read('admin/v2/styles/admin.css');

  it('opens the preserved legacy admin safely from the global top bar', () => {
    expect(shell).toContain('class="legacy-admin-link"');
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
    const mobile = styles.slice(
      styles.indexOf('@media (max-width: 760px)'),
      styles.indexOf('@media (max-width: 420px)'),
    );
    expect(mobile).toContain('.topbar-actions .legacy-admin-link');
    expect(mobile).toContain('display: inline-flex;');
    expect(mobile).toContain('.legacy-admin-link-label { display: none; }');
  });
});
```

- [ ] **Step 2: Run the contract and confirm the red state**

Run:

```powershell
npx jest --runTestsByPath tests/admin_v2_legacy_button_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because `legacy-admin-link` is not present in the current Admin 2 shell or stylesheet.

### Task 2: Add the global top-bar link and responsive styling

**Files:**
- Modify: `admin/v2/index.html:30-34`
- Modify: `admin/v2/styles/admin.css:211-216`
- Modify: `admin/v2/styles/admin.css:670-674`
- Test: `tests/admin_v2_legacy_button_contract.test.ts`

- [ ] **Step 1: Add the accessible anchor before the existing top-bar links**

Insert as the first child of `.topbar-actions`:

```html
<a class="legacy-admin-link" href="/legacy.html" target="_blank" rel="noopener" aria-label="Открыть старую админку в новой вкладке" data-tooltip="Открыть старую админку в новой вкладке — для функций, которых ещё нет в Admin 2">
  <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-9 9M19 13v6H5V5h6"/></svg>
  <span class="legacy-admin-link-label">Старая админка</span>
</a>
```

- [ ] **Step 2: Add theme-aware desktop, hover, and tooltip styles**

Add after the current `.topbar-actions a:hover` rule:

```css
.topbar-actions .legacy-admin-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid var(--warning);
  border-radius: 10px;
  background: var(--warning-soft);
  color: var(--ink);
  cursor: pointer;
  font-weight: 750;
  text-decoration: none;
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}
.topbar-actions .legacy-admin-link:hover {
  border-color: color-mix(in srgb, var(--warning) 72%, var(--ink));
  background: color-mix(in srgb, var(--warning-soft) 88%, var(--surface));
  color: var(--ink);
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(23, 32, 51, 0.1);
}
.topbar-actions .legacy-admin-link svg { width: 18px; height: 18px; }
.topbar-actions .legacy-admin-link[data-tooltip]::after {
  top: calc(100% + 8px);
  bottom: auto;
  right: 0;
  left: auto;
  transform: translateY(4px);
}
.topbar-actions .legacy-admin-link[data-tooltip]:hover::after,
.topbar-actions .legacy-admin-link[data-tooltip]:focus-visible::after { transform: translateY(0); }
```

The existing global `a:focus-visible` rule supplies the visible keyboard focus ring. Theme variables preserve readable foreground/background pairs in both light and dark modes.

- [ ] **Step 3: Override the mobile link-hiding rule only for this control**

Inside `@media (max-width: 760px)`, immediately after `.topbar-actions a { display: none; }`, add:

```css
.topbar-actions .legacy-admin-link { display: inline-flex; width: 44px; padding: 0; }
.legacy-admin-link-label { display: none; }
```

- [ ] **Step 4: Run the focused test and confirm green**

Run:

```powershell
npx jest --runTestsByPath tests/admin_v2_legacy_button_contract.test.ts --no-cache --runInBand
```

Expected: PASS, 2 tests passed.

- [ ] **Step 5: Commit only the feature files**

```powershell
git add -- admin/v2/index.html admin/v2/styles/admin.css tests/admin_v2_legacy_button_contract.test.ts
git diff --cached --check
git commit -m "feat: link Admin 2 to legacy admin"
```

### Task 3: Run focused Admin 2 quality gates

**Files:**
- Verify: `admin/v2/index.html`
- Verify: `admin/v2/styles/admin.css`
- Verify: `tests/admin_v2_legacy_button_contract.test.ts`

- [ ] **Step 1: Run the existing shell boundary contract**

```powershell
npx jest --runTestsByPath tests/admin2_primary_boundary_contract.test.ts tests/admin_v2_legacy_button_contract.test.ts --no-cache --runInBand
```

Expected: both suites PASS.

- [ ] **Step 2: Run the focused static Admin 2 audits**

```powershell
node scripts/admin-v2-smoke.mjs
node scripts/admin-v2-control-plane-smoke.mjs
node scripts/admin-v2-tooltip-audit.mjs
node scripts/admin-v2-language-audit.mjs
```

Expected: every command exits with code 0. The language audit may report pre-existing non-blocking findings because it is not invoked with `--fail`; record them separately from failures.

- [ ] **Step 3: Inspect the final diff and responsive rules**

```powershell
git show --check --stat --oneline HEAD
git show --format= -- admin/v2/index.html admin/v2/styles/admin.css tests/admin_v2_legacy_button_contract.test.ts
```

Confirm from the actual final state:

- the desktop control shows SVG plus `Старая админка`;
- the 760 px rule keeps the 44 px icon control visible while hiding only its label;
- no router, Firebase, auth, or legacy-admin content changed;
- no existing user changes are included in the feature commit.

- [ ] **Step 4: Perform proportional browser checks if a local Admin 2 session is available**

At 375, 768, 1024, and 1440 px, verify the link is visible, keyboard focus is obvious, the tooltip is not clipped, the top bar has no horizontal overflow, and the link opens `/legacy.html` in a separate tab. Check both light and dark Admin 2 themes. If no authenticated local session is available, report this browser check as not performed rather than inferring success from static tests.
