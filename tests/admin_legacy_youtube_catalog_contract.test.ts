import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const legacyAdminPath = path.join(root, 'admin', 'v2', 'legacy.html');
const source = fs.readFileSync(legacyAdminPath, 'utf8');

describe('legacy admin YouTube catalog workspace', () => {
  it('lives in the canonical legacy admin and is grouped with content', () => {
    expect(source).toContain("switchTab('youtube-catalog')");
    expect(source).toContain('id="tab-youtube-catalog"');
    expect(source).toContain('YouTube-каталог');
    expect(source).toMatch(/'youtube-catalog'\s*:\s*'community'/);
  });

  it('exposes one clear refresh action and safe operational feedback', () => {
    expect(source.match(/class="ytc-primary-action"/g)).toHaveLength(1);
    expect(source).toContain('Обновить из YouTube');
    expect(source).toContain('id="ytc-loading"');
    expect(source).toContain('id="ytc-empty"');
    expect(source).toContain('id="ytc-error"');
    expect(source).toContain('id="ytc-status-grid"');
    expect(source).toContain('id="ytc-history"');
  });

  it('supports channels, locale defaults, playlists and premiere overrides', () => {
    for (const marker of [
      'ytc-add-channel',
      'ytc-channel-list',
      'ytc-channel-youtube-id',
      'ytc-channel-locales',
      'ytc-locale-defaults',
      'ytc-add-playlist',
      'ytc-playlist-list',
      'ytc-add-premiere',
      'ytc-premiere-list',
      'ytc-preview',
      'ytc-publish-reason',
    ]) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('Скрыть плейлист');
    expect(source).toContain('Название плейлиста');
    expect(source).toContain('Время премьеры');
    expect(source).toContain('Срок действия');
    expect(source).toContain('Сбросить переопределение');
  });

  it('uses the dedicated callable API', () => {
    expect(source).toContain("httpsCallable(functionsUs, 'adminGetYoutubeCatalogWorkspace')");
    expect(source).toContain("httpsCallable(functionsUs, 'adminPublishYoutubeCatalogConfig')");
    expect(source).toContain("httpsCallable(functionsUs, 'adminRefreshYoutubeCatalog')");
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
