import { readFileSync } from 'fs';
import path from 'path';
import type { YoutubeCatalogScreenSnapshot } from '../app/youtube_catalog_client';
import {
  HOME_YOUTUBE_REVALIDATE_TTL_MS,
  isHomeYoutubeCatalogFresh,
  selectHomeYoutubeFeaturedVideo,
} from '../app/home_youtube_feature';
import type { YoutubeVideoSnapshot } from '../shared/youtube_catalog_contract';

const video = (id: string, state: YoutubeVideoSnapshot['state']): YoutubeVideoSnapshot => ({
  id,
  channelId: 'english',
  title: id,
  description: '',
  thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  watchUrl: `https://www.youtube.com/watch?v=${id}`,
  state,
  playlistIds: [],
});

const snapshot = (videos: YoutubeVideoSnapshot[], activeEvent?: YoutubeVideoSnapshot): YoutubeCatalogScreenSnapshot => ({
  version: 'v1',
  fetchedAt: new Date(1_000_000).toISOString(),
  manifest: {
    schemaVersion: 1,
    activeVersion: 'v1',
    generatedAt: new Date(1_000_000).toISOString(),
    sourceRefreshedAt: new Date(1_000_000).toISOString(),
    defaultChannelId: 'english',
    localeDefaults: { en: 'english' },
    channels: [{ id: 'english', displayName: 'English', languageTags: ['en'], order: 0 }],
  },
  channel: {
    id: 'english', youtubeChannelId: 'UCNNVZbMkh4jrW6uluaaJTwA', displayName: 'English',
    handle: '@english', url: 'https://www.youtube.com/@english', languageTags: ['en'], order: 0,
    recentVideoIds: videos.map((item) => item.id), playlistIds: [],
    ...(activeEvent ? { activeEventVideoId: activeEvent.id } : {}),
  },
  videos,
  playlists: [],
  ...(activeEvent ? { activeEvent } : {}),
});

describe('home YouTube feature card', () => {
  test('prioritizes live, then upcoming, then the newest regular video', () => {
    const regular = video('regular001', 'video');
    const upcoming = video('upcoming01', 'upcoming');
    const live = video('livevideo01', 'live');

    expect(selectHomeYoutubeFeaturedVideo(snapshot([regular, live], upcoming))?.id).toBe(live.id);
    expect(selectHomeYoutubeFeaturedVideo(snapshot([regular], upcoming))?.id).toBe(upcoming.id);
    expect(selectHomeYoutubeFeaturedVideo(snapshot([regular]))?.id).toBe(regular.id);
    expect(selectHomeYoutubeFeaturedVideo(snapshot([]))).toBeNull();
  });

  test('revalidates only after the below-fold cache TTL', () => {
    const value = snapshot([video('regular001', 'video')]);
    expect(isHomeYoutubeCatalogFresh(value, 1_000_000 + HOME_YOUTUBE_REVALIDATE_TTL_MS - 1)).toBe(true);
    expect(isHomeYoutubeCatalogFresh(value, 1_000_000 + HOME_YOUTUBE_REVALIDATE_TTL_MS)).toBe(false);
    expect(isHomeYoutubeCatalogFresh(null, 1_000_000)).toBe(false);
  });

  test('uses the atomic catalog, respects runtime/remote control, and never embeds a Home WebView', () => {
    const root = path.join(__dirname, '..');
    const card = readFileSync(path.join(root, 'components/home/HomeYoutubeFeatureCard.tsx'), 'utf8');
    const home = readFileSync(path.join(root, 'app/(tabs)/home.tsx'), 'utf8');

    expect(home).toContain('<HomeYoutubeFeatureCard ownerActive={homeRuntimeActive} studyTarget={studyTarget} />');
    expect(home.indexOf('<HomeYoutubeFeatureCard')).toBeGreaterThan(home.indexOf('<DailyPhraseCard'));
    expect(card).toContain('fetchYoutubeHomeFeatureCatalog');
    expect(card).toContain('const manifest = await fetchYoutubeCatalogManifest();');
    expect(card).not.toContain('warm?.manifest ?? await fetchYoutubeCatalogManifest()');
    expect(card).toContain('peekYoutubeCatalogScreenSnapshot');
    expect(card).toContain('if (!ownerActive || !enabled || !renderScope) return;');
    expect(card).toContain('isVideoButtonEnabled');
    expect(card).toContain('accessibilityRole="button"');
    expect(card).toContain("pathname: '/lingman_video_player'");
    expect(card).not.toContain('WebView');
    expect(card).not.toContain('setInterval');
    expect(card).not.toContain('revalidateYoutubeChannelCatalog');
  });
});
