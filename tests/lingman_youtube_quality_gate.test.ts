import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(__dirname, '..');

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('lingman YouTube quality gate', () => {
  const catalogSource = () => readProjectFile('app/lingman_videos.tsx');
  const playerSource = () => readProjectFile('app/lingman_video_player.tsx');
  const buttonSource = () => readProjectFile('components/LingmanVideosButton.tsx');
  const dataSource = () => readProjectFile('app/lingman_youtube.ts');

  it('uses theme-native chrome instead of hardcoded YouTube red in app surfaces', () => {
    const combined = [catalogSource(), playerSource(), buttonSource()].join('\n');

    expect(combined).not.toMatch(/#E11D48|#EF4444/);
    expect(combined).toContain('getLingmanYoutubeChrome');
    expect(combined).toContain('accent');
  });

  it('keeps the home YouTube entry accessible and at least 44 dp tall', () => {
    const source = buttonSource();

    expect(source).toContain('testID="home-lingman-youtube-button"');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('AccessibilityInfo');
    expect(source).toMatch(/height:\s*(4[4-9]|[5-9]\d)/);
  });

  it('marks video notifications as seen from the player path, not from catalog load', () => {
    const catalog = catalogSource();
    const loadBody = catalog.match(/const load = useCallback[\s\S]*?\n  \}, \[\]\);/)?.[0] ?? '';

    expect(loadBody).not.toContain('markLingmanYoutubeCatalogSeen');
    expect(catalog).toContain('markLingmanYoutubeCatalogSeen(video.id)');
  });

  it('hardens player and external YouTube navigation', () => {
    const combined = [catalogSource(), playerSource(), dataSource()].join('\n');
    const player = playerSource();

    expect(combined).toContain('getTrustedLingmanYoutubeUrl');
    expect(player).toContain('originWhitelist={LINGMAN_WEBVIEW_ORIGIN_WHITELIST}');
    expect(player).toContain('buildLingmanEmbedHtml');
    expect(player).toContain('baseUrl: LINGMAN_YOUTUBE_EMBED_BASE_URL');
    expect(dataSource()).toContain('LINGMAN_YOUTUBE_EMBED_BASE_URL');
    expect(dataSource()).toContain('widget_referrer');
    expect(player).toContain('onError');
    expect(player).toContain('onHttpError');
    expect(player).toContain('onShouldStartLoadWithRequest');
    expect(player).toContain('shouldKeepLingmanPlayerNavigationInApp');
    expect(player).toContain('testID="lingman-player-webview"');
    expect(player).toContain('testID="lingman-player-error"');
  });

  it('exposes stable catalog test IDs and empty/fallback states', () => {
    const catalog = catalogSource();

    expect(catalog).toContain('testID="lingman-videos-screen"');
    expect(catalog).toContain('testID="lingman-videos-list"');
    expect(catalog).toContain('testID="lingman-video-card"');
    expect(catalog).toContain('testID="lingman-videos-empty"');
    expect(catalog).toContain('testID="lingman-videos-fallback-notice"');
  });

  it('ships transparent message-scale themed YouTube icons', async () => {
    const assetDir = path.join(root, 'assets/images/lingman');
    const messageDir = path.join(root, 'assets/images/messages');
    const assetPairs = [
      ['youtube-dark.webp', 'message-forest.webp'],
      ['youtube-neon.webp', 'message-neon.webp'],
      ['youtube-gold.webp', 'message-gold.webp'],
      ['youtube-coral.webp', 'message-coral.webp'],
      ['youtube-minimalLight.webp', 'message-minimal-light.webp'],
      ['youtube-minimalDark.webp', 'message-minimal-dark.webp'],
    ];

    async function alphaStats(assetPath: string) {
      const image = sharp(assetPath);
      const metadata = await image.metadata();
      const stats = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alphaValues = [];
      for (let index = 3; index < stats.data.length; index += 4) alphaValues.push(stats.data[index]);
      const transparentPixels = alphaValues.filter((value) => value === 0).length;
      const visiblePixels = alphaValues.filter((value) => value > 0).length;

      return {
        metadata,
        transparentRatio: transparentPixels / alphaValues.length,
        visibleRatio: visiblePixels / alphaValues.length,
      };
    }

    for (const [assetName, messageAssetName] of assetPairs) {
      const icon = await alphaStats(path.join(assetDir, assetName));
      const messageIcon = await alphaStats(path.join(messageDir, messageAssetName));

      expect(icon.metadata.width).toBe(320);
      expect(icon.metadata.height).toBe(224);
      expect(icon.metadata.hasAlpha).toBe(true);
      expect(icon.transparentRatio).toBeGreaterThan(0.43);
      expect(icon.visibleRatio).toBeGreaterThan(messageIcon.visibleRatio - 0.04);
      expect(icon.visibleRatio).toBeLessThan(messageIcon.visibleRatio + 0.1);
    }
  });
});
