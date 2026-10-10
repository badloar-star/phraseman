import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('lingman YouTube quality gate', () => {
  const catalogSource = () => readProjectFile('app/lingman_videos.tsx');
  const inlinePlayerSource = () => readProjectFile('components/youtube/YoutubeInlinePlayer.tsx');
  const dataSource = () => readProjectFile('app/lingman_youtube.ts');

  it('uses theme-native chrome instead of hardcoded YouTube red in app surfaces', () => {
    const combined = [catalogSource(), inlinePlayerSource()].join('\n');

    expect(combined).not.toMatch(/#E11D48|#EF4444/);
    expect(combined).toContain('getLingmanYoutubeChrome');
    expect(combined).toContain('accent');
  });

  it('refreshes the home video badge on focus and app resume', () => {
    const home = readProjectFile('app/(tabs)/home.tsx');

    // зачем (01.10, удаление Главной V1): кнопка «Видеоуроки» со счётчиком жила в шапке V1.
    // На Главной 2.0 видео — лента; снимок читается заново при фокусе (focusTick в зависимостях).
    expect(home).not.toContain('testID="home-header-videos"');
    expect(home).toContain('getLingmanYoutubeSnapshot');
    expect(home).toContain('[focusTick, homeRuntimeActive, studyTarget]');
  });

  it('marks video notifications as seen as soon as the catalog opens', () => {
    const catalog = catalogSource();

    expect(catalog).toContain('markLingmanYoutubeCatalogSeen(latestVideoId)');
    expect(catalog).toContain('unreadCount: 0');
  });

  it('hardens player and external YouTube navigation', () => {
    const combined = [catalogSource(), inlinePlayerSource(), dataSource()].join('\n');
    const player = inlinePlayerSource();

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
    expect(player).not.toContain('testID="lingman-player-error"');
    expect(player).toContain('testID="lingman-player-poster"');
    expect(player).not.toContain('lingman-inline-player-youtube');
    expect(player).not.toContain('Linking.openURL');
  });

  it('connects the catalog to the Professor Lingman English YouTube channel', () => {
    const combined = [catalogSource(), dataSource()].join('\n');

    // зачем (10.10): id канала переехал в дисковый снимок ленты (lingman_youtube_feed_disk) — модуль данных
    // берёт его оттуда; проверяем и связку, и само значение.
    expect(dataSource()).toContain('LINGMAN_CHANNEL_ID = LINGMAN_DEFAULT_CHANNEL_ID');
    expect(readProjectFile('app/lingman_youtube_feed_disk.ts')).toContain("LINGMAN_DEFAULT_CHANNEL_ID = 'UCIr8fwZjbDtcUlQ-IKIbndg'");
    expect(dataSource()).toContain("LINGMAN_CHANNEL_HANDLE = '@professorlingman'");
    expect(dataSource()).toContain('https://www.youtube.com/@professorlingman/videos');
    expect(combined).toContain('LINGMAN_CHANNEL_DISPLAY_NAME');
    // зачем: @PhrasemanENGLISH удалён (404), UCNNVZbMkh4jrW6uluaaJTwA — итальянский канал.
    expect(combined).not.toContain("= '@PhrasemanENGLISH'");
    expect(combined).not.toContain("= 'UCNNVZbMkh4jrW6uluaaJTwA'");
  });

  it('filters Shorts out and keeps the YouTube tab for long videos only', () => {
    const data = dataSource();

    expect(data).toContain('isLingmanLongFormVideo');
    expect(data).toContain('KNOWN_SHORT_VIDEO_IDS');
    expect(data).toContain('SHORTS_MARKER_RE');
    expect(data).toContain('.filter(isLingmanLongFormVideo)');
  });

  it('exposes stable catalog test IDs and empty/fallback states', () => {
    const catalog = catalogSource();

    expect(catalog).toContain('testID="lingman-videos-screen"');
    expect(catalog).toContain('testID="lingman-videos-list"');
    expect(catalog).toContain('testID="lingman-video-card"');
    expect(catalog).toContain('testID="lingman-videos-empty"');
    expect(catalog).toContain('testID="lingman-videos-fallback-notice"');
  });

  it('uses the wired vector icon path without shipping dead per-theme YouTube art', () => {
    const assetDir = path.join(root, 'assets/images/lingman');
    const combined = [catalogSource(), inlinePlayerSource()].join('\n');
    expect(combined).toContain("import Ionicons from '@expo/vector-icons/Ionicons'");
    for (const assetName of ['youtube-dark.webp', 'youtube-gold.webp', 'youtube-minimalDark.webp']) {
      expect(combined).not.toContain(assetName);
      expect(fs.existsSync(path.join(assetDir, assetName))).toBe(false);
    }
  });
});
