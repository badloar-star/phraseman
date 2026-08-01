import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('Lingman video entry', () => {
  it('clears the new-video marker as soon as the catalog is opened', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lingman_videos.tsx'), 'utf8');

    expect(source).toContain('const latestVideoId = next.latestVideoId ?? next.videos[0]?.id ?? null;');
    expect(source).toContain('void markLingmanYoutubeCatalogSeen(latestVideoId);');
    expect(source).toContain('if (warm?.isFresh && mode !== \'refresh\' && warm.value.unreadCount > 0)');
    expect(source).toContain('unreadCount: 0');
  });
});
