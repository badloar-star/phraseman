import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('Lingman video entry', () => {
  it('clears the new-video marker as soon as the catalog is opened', () => {
    const screenSource = fs.readFileSync(path.join(ROOT, 'app', 'lingman_videos.tsx'), 'utf8');
    const buttonSource = fs.readFileSync(path.join(ROOT, 'components', 'LingmanVideosButton.tsx'), 'utf8');

    expect(buttonSource).toMatch(/onPress=\{\(\) => \{[\s\S]*setUnreadCount\(0\);[\s\S]*router\.push\('\/lingman_videos'/);
    expect(buttonSource).toContain('void markLingmanYoutubeCatalogSeen(latestVideoIdRef.current);');
    expect(screenSource).toContain('const latestVideoId = next.latestVideoId ?? next.videos[0]?.id ?? null;');
    expect(screenSource).toContain('void markLingmanYoutubeCatalogSeen(latestVideoId);');
    expect(screenSource).toContain('if (warm?.isFresh && mode !== \'refresh\' && warm.value.unreadCount > 0)');
    expect(screenSource).toContain('unreadCount: 0');
    expect(screenSource).toMatch(/const next = await revalidateYoutubeChannelCatalog[\s\S]*void markLingmanYoutubeSectionOpened\(\);/);
  });
});
