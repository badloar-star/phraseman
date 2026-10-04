import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const legacyAdminPath = path.join(root, 'admin', 'v2', 'legacy.html');
const source = fs.readFileSync(legacyAdminPath, 'utf8');

describe('legacy admin YouTube catalog workspace', () => {
  it('lives in the canonical legacy admin and is grouped with content', () => {
    expect(source).toContain("switchTab('youtube-catalog')");
    expect(source).toContain('id="tab-youtube-catalog"');
    expect(source).toContain('YouTube-');
    expect(source).toMatch(/'youtube-catalog'\s*:\s*'community'/);
  });

  it('keeps channel setup to link, name, language, and one save action', () => {
    expect(source).toContain('id="ytc-loading"');
    expect(source).toContain('id="ytc-error"');
    for (const marker of ['ytc-add-channel', 'ytc-channel-list', 'ytc-channel-youtube-id', 'ytc-channel-name', 'ytc-channel-locales', 'ytc-save-channel']) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('#ytc-refresh,#ytc-empty,#ytc-status-grid,#ytc-remove-channel');
    expect(source).toContain('#ytc-channel-editor>.ytc-section:nth-of-type(n+2),.ytc-footer{display:none!important}');
    expect(source).toContain("const button = document.getElementById('ytc-save-channel');");
    expect(source).toContain('channel.languageTags = tag ? [tag] : [];');
    expect(source).toContain("ytcShowState('ytc-error', true, validationErrors[0]);");
    expect(source).toContain("const field = document.getElementById('ytc-channel-youtube-id'); if (field) field.focus();");
    expect(source).not.toContain("const field = document.getElementById('ytc-channel-id'); if (field) field.focus();");
  });

  it('uses the dedicated callable API', () => {
    expect(source).toContain("httpsCallable(functionsUs, 'adminGetYoutubeCatalogWorkspace')");
    expect(source).toContain("httpsCallable(functionsUs, 'adminPublishYoutubeCatalogConfig')");
  });

  it('renders catalog-owned text without HTML injection or App Check initialization', () => {
    const start = source.indexOf('/* YOUTUBE_CATALOG_ADMIN_START */');
    const end = source.indexOf('/* YOUTUBE_CATALOG_ADMIN_END */');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const catalogScript = source.slice(start, end);
    expect(catalogScript).not.toContain('.innerHTML');
    expect(catalogScript).not.toContain('initializeAppCheck');
    expect(catalogScript).toContain('.textContent');
  });
});
