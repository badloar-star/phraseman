import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('multichannel YouTube catalog UI contract', () => {
  const screen = () => read('app/lingman_videos.tsx');
  const components = () => [
    'components/youtube/YoutubeChannelHeader.tsx',
    'components/youtube/YoutubeChannelPickerSheet.tsx',
    'components/youtube/YoutubeChannelTabs.tsx',
    'components/youtube/YoutubeInlinePlayer.tsx',
    'components/youtube/YoutubePremiereHero.tsx',
    'components/youtube/YoutubePlaylistGridCard.tsx',
    'components/youtube/YoutubeVideoGridCard.tsx',
    'components/youtube/YoutubeVideoCard.tsx',
  ].map(read).join('\n');

  it('coordinates cached one-shot catalog loading and persistent auto/manual channel selection', () => {
    const source = screen();
    expect(source).toContain('peekYoutubeCatalogScreenSnapshot');
    expect(source).toContain('revalidateYoutubeChannelCatalog');
    expect(source).toContain('resolvePreferredYoutubeChannel');
    expect(source).toContain('setYoutubeChannelPreference');
    expect(source).not.toContain('onSnapshot(');
  });

  it('selects the automatic channel by the language being studied, not the interface language', () => {
    const source = screen();
    expect(source).toContain('const { studyTarget: globalStudyTarget } = useStudyTarget();'); // язык раздела = локальный выбор или язык из Настроек (владелец 15.10)
    expect(source).toContain('const studyTarget = sectionLanguage.language;');
    expect(source).toContain('resolvePreferredYoutubeChannel(manifest, studyTarget, currentPreference)');
    expect(source).toContain('resolvePreferredYoutubeChannel(manifest, studyTarget, nextPreference)');
    expect(source).not.toContain('resolvePreferredYoutubeChannel(manifest, lang,');
  });

  // зачем (владелец 01.10): вкладки «Все видео» нет; канал — контур языка обучения.
  it('replaces the old channel strip and shows two tabs: home and playlists', () => {
    const source = `${screen()}\n${components()}`;
    expect(source).toContain('testID="youtube-all-channels"');
    expect(source).not.toContain('youtube-all-channels-legacy');
    expect(source).toContain('testID={`youtube-channel-${channel.id}`}');
    expect(source).toContain("testID={`youtube-tab-${tab}`}");
    expect(source).toContain("(['home', 'playlists', 'packs'] as const)");
    expect(source).not.toContain("(['home', 'all', 'playlists'] as const)");
    // зачем (владелец 01.10): вкладка «Все видео» удалена вместе с веткой экрана.
    expect(screen()).not.toContain('testID="youtube-catalog-all-videos"');
    expect(screen()).not.toContain("tab === 'all'");
  });

  it('keeps playlist rows exclusively on the playlists tab', () => {
    const source = screen();
    expect(source).toContain("tab === 'playlists' ?");
    expect(source).not.toContain("catalog?.playlists.length ? <><Text style={[styles.sectionTitle");
    expect(source).not.toContain('featuredPlaylists: triLang');
  });

  it('starts premieres from the preview and keeps the reminder action accessible', () => {
    const source = components();
    expect(source).toContain('testID="youtube-premiere-upcoming"');
    expect(source).toContain('testID="youtube-premiere-live"');
    expect(source).toContain('testID="youtube-premiere-thumbnail"');
    expect(source).toContain('testID="youtube-premiere-details"');
    expect(source).toContain('testID="youtube-premiere-countdown"');
    expect(source).toContain('testID="youtube-premiere-remind"');
    expect(source).not.toContain('testID="youtube-premiere-watch"');
    expect(source).toMatch(/testID="youtube-premiere-thumbnail"[\s\S]{0,220}onPress=\{onWatch\}/);
    expect(source).toContain('accessibilityLabel={countdownAccessibilityLabel}');
    expect(source).toContain('minHeight: 44');
  });

  it('supports playlist rows/detail/play-all and keeps one user-initiated inline player', () => {
    const source = `${screen()}\n${components()}\n${read('app/lingman_playlist.tsx')}`;
    const videoCard = read('components/youtube/YoutubeVideoCard.tsx');
    expect(source).toContain('testID="youtube-playlist-row"');
    expect(source).toContain('testID="youtube-playlist-detail"');
    expect(source).toContain('testID="youtube-playlist-play-all"');
    expect(source).toContain('YoutubeInlinePlayer');
    expect(source).toContain('const [activeVideoId, setActiveVideoId]');
    expect(source).toContain('setActiveVideoId(video.id)');
    expect(source).toContain('active={screenRuntimeActive}');
    // зачем (владелец 11.10, video-redesign #c1): обычный ролик открывается экраном ролика; встроенный плеер остаётся у премьеры в шапке.
    expect(source).toContain('hero.id === activeVideoId ? (');
    expect(source).toContain('presentation="preview"');
    expect(source).toContain('{inlinePlayer ? <Animated.View entering={VIDEO_PLAYER_REVEAL}');
    expect(videoCard).not.toContain('testID="lingman-video-watch"');
    expect(videoCard).not.toContain('testID="lingman-video-open-youtube"');
    expect(videoCard).not.toContain('onOpenYoutube');
    expect(source).not.toContain('lingman-inline-player-youtube');
    expect(source).not.toContain("pathname: '/lingman_video_player'");
    expect(read('app/_layout.tsx')).not.toContain('<Stack.Screen name="lingman_video_player" />');
    expect(fs.existsSync(path.join(root, 'app/lingman_video_player.tsx'))).toBe(false);
    expect(source).toContain('getTrustedLingmanYoutubeUrl');
    expect(read('app/_layout.tsx')).toContain('<Stack.Screen name="lingman_playlist" />');
  });

  it('shows skeletons instead of error/offline/stale surfaces (владелец 01.10)', () => {
    const source = screen();
    expect(source).toContain('testID="youtube-catalog-loading"');
    for (const id of ['youtube-catalog-stale', 'youtube-catalog-offline', 'youtube-catalog-error', 'youtube-catalog-retry']) {
      expect(source).not.toContain(id);
    }
    expect(source).toContain("issue === 'error'");
  });

  it('keeps the redesigned shell visible while the catalog is still on RSS fallback', () => {
    const source = screen();
    // зачем: по макету video.html вкладки рисуются в каждом состоянии (загрузка/пусто/ошибка тоже)
    expect(source).toContain('<YoutubeChannelTabs value={tab}');
    expect(source).toContain("tab === 'playlists' ?");
    expect(source).not.toContain("tab === 'all' || !catalog ?");
  });
});
