import fs from 'fs';
import path from 'path';

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

  it('refreshes the home video badge on focus and app resume', () => {
    const source = buttonSource();

    expect(source).toContain('useIsFocused');
    expect(source).toContain("AppState.addEventListener('change'");
    expect(source).toContain("state !== 'active'");
    expect(source).toContain('remote_config_changed');
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

  it('wires governed events without route titles or direct analytics backends', () => {
    const catalog = catalogSource();
    const player = playerSource();
    const button = buttonSource();
    const combined = [catalog, player, button].join('\n');

    expect(button).toContain("eventName: 'youtube_home_entry_click'");
    expect(catalog).toContain("eventName: 'youtube_catalog_open'");
    expect(catalog).toContain("eventName: 'youtube_video_select'");
    expect(catalog).toContain("eventName: 'youtube_external_video_open'");
    expect(catalog).toContain("eventName: 'youtube_channel_open'");
    expect(player).toContain("eventName: 'youtube_player_ready'");
    expect(player).toContain("eventName: 'youtube_playback_start'");
    expect(player).toContain("eventName: 'youtube_playback_checkpoint'");
    expect(player).toContain("eventName: 'youtube_playback_end'");
    expect(combined).toContain('emitYoutubeAnalyticsEvent');
    expect(combined).not.toMatch(/from ['"]\.\/analytics['"]/);
    expect(combined).not.toMatch(/firebase|posthog|AsyncStorage/);
    expect(catalog).not.toMatch(/params:\s*\{[^}]*title:/s);
    expect(catalog).not.toMatch(/params:\s*\{[^}]*watchUrl:/s);
    expect(player).not.toContain('useLocalSearchParams<{ id?: string; title?: string; watchUrl?: string }>');
    const catalogExternal = catalog.match(/const openExternalVideo[\s\S]*?\n  \};/)?.[0] ?? '';
    expect(catalogExternal.indexOf('emitYoutubeAnalyticsEvent')).toBeLessThan(catalogExternal.indexOf('Linking.openURL'));
    const playerExternal = player.match(/const openExternal = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? '';
    expect(playerExternal.indexOf("runtime.finish('external'")).toBeLessThan(playerExternal.indexOf('emitYoutubeAnalyticsEvent'));
    expect(playerExternal.indexOf('emitYoutubeAnalyticsEvent')).toBeLessThan(playerExternal.indexOf('Linking.openURL'));
  });

  it('gates player polling by consent, focus, and AppState without native intervals', () => {
    const player = playerSource();

    expect(player).toContain('useIsScreenFocused()');
    expect(player).toContain('subscribeAnalyticsConsent');
    expect(player).toContain('getAnalyticsConsentState');
    expect(player).toContain("AppState.addEventListener('change'");
    expect(player).toContain('__phrasemanSetAnalyticsActive');
    expect(player).toContain('injectedJavaScriptBeforeContentLoaded');
    expect(player).toContain('onMessage');
    expect(player).toContain('parseYoutubePlayerMessage');
    expect(player).toContain("runtime.revokeConsent()");
    expect(player).not.toContain('setInterval(');
    expect(player).not.toMatch(/videoTitle\s*:|video_title\s*:/);
  });

  it('normalizes malformed deep-link video IDs before building player HTML during render', () => {
    const player = playerSource();

    expect(dataSource()).toContain('getValidLingmanYoutubeVideoId');
    expect(player).toContain('getValidLingmanYoutubeVideoId');
    expect(player).toContain('const validVideoId = getValidLingmanYoutubeVideoId(id)');
    expect(player).toContain('validVideoId ? buildLingmanEmbedHtml(validVideoId) : null');
    expect(player).toContain('{validVideoId && !playerError ? (');
    expect(player).not.toContain('id ? buildLingmanEmbedHtml(id) : null');
  });

  it('connects the catalog to the PHRASEMAN English YouTube channel', () => {
    const combined = [catalogSource(), buttonSource(), dataSource()].join('\n');

    expect(dataSource()).toContain("LINGMAN_CHANNEL_ID = 'UCNNVZbMkh4jrW6uluaaJTwA'");
    expect(dataSource()).toContain("LINGMAN_CHANNEL_HANDLE = '@PhrasemanENGLISH'");
    expect(dataSource()).toContain('https://www.youtube.com/@PhrasemanENGLISH/videos');
    expect(combined).toContain('LINGMAN_CHANNEL_DISPLAY_NAME');
    expect(combined).not.toContain('@professorlingman');
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

  it('uses theme-colored native video icons without shipping dead per-theme raster assets', () => {
    const combined = [catalogSource(), playerSource(), buttonSource()].join('\n');

    expect(combined).toContain('<Ionicons');
    expect(combined).toContain('color={chrome.accent}');
    expect(combined).not.toContain("require('../assets/images/lingman/");
  });
});
