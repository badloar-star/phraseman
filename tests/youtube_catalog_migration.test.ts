import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('YouTube catalog migration and rollback bridge', () => {
  const legacyAdmin = read('admin/v2/legacy.html');
  const mobileScreen = read('app/lingman_videos.tsx');

  it('bootstraps the first draft from legacy remote-config values without deleting them', () => {
    const start = legacyAdmin.indexOf('function ytcBootstrapLegacyConfig');
    const end = legacyAdmin.indexOf('\n  function ytcSelectedChannel', start);
    const helper = legacyAdmin.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(helper).toContain('youtube_channel_id');
    expect(helper).toContain('youtube_channel_name');
    expect(helper).toContain('youtube_pinned_videos');
    expect(helper).toContain("id: 'legacy-primary'");
    expect(helper).toContain("en: 'legacy-primary'");
    expect(helper).not.toMatch(/delete\s+legacy\.|saveControlPanelTexts|publishAdminRemoteConfigPatch/);
    expect(legacyAdmin).toContain('ytcBootstrapLegacyConfig(data.config, legacyTexts)');
  });

  it('keeps the canonical legacy admin as the only YouTube catalog editor', () => {
    expect(legacyAdmin).toContain('YOUTUBE_CATALOG_ADMIN_START');
    expect(fs.existsSync(path.join(root, 'admin', 'legacy.html'))).toBe(false);
    expect(read('admin/v2/index.html')).not.toContain('YOUTUBE_CATALOG_ADMIN_START');
  });

  it('retains the pre-catalog RSS and pinned-video entry path', () => {
    expect(mobileScreen).toContain('getLingmanYoutubeSnapshot');
    expect(mobileScreen).toContain('peekYoutubeCatalogScreenSnapshot');
    expect(mobileScreen).toContain('if (!catalogRef.current) await loadLegacyFallback()');
    const legacyRuntime = read('app/lingman_youtube.ts');
    expect(legacyRuntime).toContain('mergePinnedVideos(pinned, feed)');
    expect(legacyRuntime).toContain('readCachedVideos()) ?? (isDefaultChannel ? FALLBACK_VIDEOS : [])');
  });
});
