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
    'components/youtube/YoutubePremiereHero.tsx',
    'components/youtube/YoutubePlaylistRow.tsx',
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

  it('replaces the old channel strip with all-channels picker and three stable tabs', () => {
    const source = `${screen()}\n${components()}`;
    expect(source).toContain('testID="youtube-all-channels"');
    expect(source).toContain('testID="youtube-channel-auto"');
    expect(source).toContain('testID={`youtube-channel-${channel.id}`}');
    expect(source).toContain("testID={`youtube-tab-${tab}`}");
    expect(source).toContain("(['home', 'playlists', 'all'] as const)");
  });

  it('exposes upcoming/live heroes, countdown, reminder and watch actions accessibly', () => {
    const source = components();
    expect(source).toContain('testID="youtube-premiere-upcoming"');
    expect(source).toContain('testID="youtube-premiere-live"');
    expect(source).toContain('testID="youtube-premiere-countdown"');
    expect(source).toContain('testID="youtube-premiere-remind"');
    expect(source).toContain('testID="youtube-premiere-watch"');
    expect(source).toContain('accessibilityLabel={countdownAccessibilityLabel}');
    expect(source).toContain('minHeight: 44');
  });

  it('supports playlist rows/detail/play-all and keeps video playback user initiated', () => {
    const source = `${screen()}\n${components()}\n${read('app/lingman_playlist.tsx')}`;
    expect(source).toContain('testID="youtube-playlist-row"');
    expect(source).toContain('testID="youtube-playlist-detail"');
    expect(source).toContain('testID="youtube-playlist-play-all"');
    expect(source).toContain("pathname: '/lingman_video_player'");
    expect(source).toContain('getTrustedLingmanYoutubeUrl');
    expect(source).not.toContain('autoplay=1');
    expect(read('app/_layout.tsx')).toContain('<Stack.Screen name="lingman_playlist" />');
  });

  it('has explicit loading, empty, stale, offline and error surfaces', () => {
    const source = screen();
    for (const id of ['youtube-catalog-loading', 'youtube-catalog-empty', 'youtube-catalog-stale', 'youtube-catalog-offline', 'youtube-catalog-error']) {
      expect(source).toContain(`testID="${id}"`);
    }
  });

  it('keeps the redesigned shell visible while the catalog is still on RSS fallback', () => {
    const source = screen();
    expect(source).toContain('{(catalog || snapshot) && <YoutubeChannelTabs');
    expect(source).toContain("tab === 'all' ?");
    expect(source).toContain("tab === 'playlists' ?");
    expect(source).not.toContain("tab === 'all' || !catalog ?");
  });
});
