import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Admin 2 primary boundary', () => {
  it('uses a modular Admin 2 shell with exactly seven top-level sections', () => {
    const shell = read('admin/v2/index.html');
    const core = read('admin/v2/scripts/admin-core.js');

    expect(shell).toContain('src="/scripts/admin-router.js"');
    expect(shell).toContain('href="/styles/admin.css"');
    expect(shell).toContain('id="primary-nav"');
    const sectionStart = core.indexOf('export const ADMIN_SECTIONS');
    const sectionEnd = core.indexOf(']);', sectionStart);
    const sections = core.slice(sectionStart, sectionEnd);
    for (const route of ['overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics']) {
      expect(sections).toContain(`route: '${route}'`);
    }
    expect(sections.match(/route: '(overview|application|users|money|content|community|diagnostics)'/g)).toHaveLength(7);
  });

  it('treats / as the only canonical Admin entry exposed by its shell and runtime', () => {
    const sources = [
      read('admin/v2/index.html'),
      read('admin/v2/scripts/admin-capabilities.js'),
      read('admin/v2/scripts/admin-router.js'),
      read('admin/v2/scripts/admin-core.js'),
    ];
    expect(sources[0]).toContain('href="/styles/admin.css"');
    expect(sources[0]).toContain('src="/scripts/admin-router.js"');
    expect(sources[0]).not.toContain('="/v2/');
    for (const source of sources) {
      expect(source).not.toMatch(/\.\.\/\.\.\/admin\/index\.html|\/legacy\.html|LEGACY_ROUTE_MAP|legacyTab|legacyPage|capabilityUrl/i);
    }
  });

  it('publishes only Admin V2 at Hosting root and keeps migration source out of the release', () => {
    const firebase = JSON.parse(read('firebase.json')) as {
      hosting?: Array<{
        target?: string;
        public?: string;
        ignore?: string[];
        redirects?: Array<{ source?: string; destination?: string; type?: number }>;
      }>;
    };
    const adminHosting = firebase.hosting?.find((entry) => entry.target === 'admin');

    expect(adminHosting).toBeDefined();
    expect(adminHosting?.public).toBe('admin/v2');
    expect(adminHosting?.ignore).toContain('migration.html');
    expect(adminHosting?.redirects).toEqual([
      { source: '/v2', destination: '/', type: 302 },
      { source: '/v2/', destination: '/', type: 302 },
    ]);
    expect(adminHosting?.redirects?.some((redirect) => redirect.source?.startsWith('/admin'))).toBe(false);
  });

  it('adds human hover guidance to every rendered button or link that lacks it', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const guidance = read('admin/v2/scripts/admin-guidance.js');
    expect(core).toContain("root.querySelectorAll('button, a')");
    expect(core).toContain('specificGuidanceForControl({');
    expect(core).toContain('ensureInteractiveGuidance(document)');
    expect(guidance).toContain("'publish-remote-config': '");
    expect(guidance).toContain("'dispatch-support-reply': '");
  });
});
