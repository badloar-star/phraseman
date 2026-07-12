import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Admin 2 primary boundary', () => {
  it('uses a modular Admin 2 shell with exactly seven top-level sections', () => {
    const shell = read('admin/v2/index.html');
    const core = read('admin/v2/scripts/admin-core.js');

    expect(shell).toContain('src="/v2/scripts/admin-router.js"');
    expect(shell).toContain('href="/v2/styles/admin.css"');
    const sectionStart = core.indexOf('export const ADMIN_SECTIONS');
    const sectionEnd = core.indexOf(']);', sectionStart);
    const sections = core.slice(sectionStart, sectionEnd);
    for (const route of ['overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics']) {
      expect(sections).toContain(`route: '${route}'`);
    }
    expect(sections.match(/route: '(overview|application|users|money|content|community|diagnostics)'/g)).toHaveLength(7);
  });

  it('makes Admin 2 the root entry while preserving legacy separately', () => {
    const rootEntry = read('admin/index.html');
    expect(rootEntry).toContain('/v2/');
    expect(rootEntry).not.toContain('id="tab-analytics"');
    expect(fs.existsSync(path.join(ROOT, 'admin/legacy.html'))).toBe(true);
  });

  it('does not place new detailed analytics inside legacy', () => {
    const legacy = read('admin/legacy.html');
    expect(legacy).not.toContain('id="product-analytics-panel"');
    expect(legacy).not.toContain('v2/product-analytics.js');
    expect(legacy).not.toContain('v2/subscription-analytics.js');
  });

  it('opens legacy fallbacks directly and never embeds the frame-blocked legacy page', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    const core = read('admin/v2/scripts/admin-core.js');
    const migration = read('admin/v2/migration.html');
    expect(capabilities).toContain('`/legacy.html#${encodeURIComponent(capability.legacyTab)}`');
    expect(core).not.toContain('<iframe');
    expect(migration).toContain('href="/legacy.html#${encodeURIComponent(tab)}"');
    expect(migration).not.toContain('../../admin/index.html');
  });

  it('adds human hover guidance to every rendered button or link that lacks it', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const guidance = read('admin/v2/scripts/admin-guidance.js');
    expect(core).toContain("root.querySelectorAll('button, a')");
    expect(core).toContain('specificGuidanceForControl({');
    expect(core).toContain('ensureInteractiveGuidance(document)');
    expect(guidance).toContain("'publish-remote-config': 'Опубликовать проверенные изменения Remote Config");
    expect(guidance).toContain("'dispatch-support-reply': 'Подтвердить и отправить запечатанный ответ");
  });
});
