import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const screen = read('app/lingman_videos.tsx');
const playlist = read('app/lingman_playlist.tsx');
const kit = read('components/video/VideoGlassKit.tsx');
const hero = read('components/youtube/YoutubePremiereHero.tsx');
const card = read('components/youtube/YoutubeVideoCard.tsx');
const row = read('components/youtube/YoutubePlaylistRow.tsx');
const header = read('components/youtube/YoutubeChannelHeader.tsx');
const tabs = read('components/youtube/YoutubeChannelTabs.tsx');
const packs = read('app/flashcards_video_packs.tsx');
const views = read('components/video/formatViewCount.ts');

test('video.html: packs row lives inside the Home tab after the premiere, before "New videos"', () => {
  const home = screen.slice(screen.indexOf('testID="lingman-videos-list" showsVerticalScrollIndicator'));
  assert.ok(home.indexOf('{packsRow}') > home.indexOf('<YoutubePremiereHero'), 'packs row after the premiere hero');
  assert.ok(home.indexOf('{packsRow}') < home.indexOf('{copy.recent}'), 'packs row before the section title');
  assert.ok(screen.includes('testID="video-tab-packs-row"'), 'packs row keeps its testID and action');
  assert.ok(screen.includes("router.push('/flashcards_video_packs' as never)"), 'packs row keeps its route');
  assert.match(screen, /\{packsRow\}\s*<VideoStateBlock g=\{g\} icon="play" text=\{copy\.empty\}/, 'empty state shows the packs row like the mockup');
  assert.ok(screen.includes('<YoutubeChannelTabs value={tab} onChange={changeTab} />'), 'tabs are drawn in every state');
});

test('video.html: header pill has avatar/initials, tabs are 16/600, section title is 20/26', () => {
  assert.ok(header.includes('testID="youtube-channel-avatar"'), 'channel avatar in the pill');
  assert.ok(header.includes('avatarText'), 'initials fallback');
  assert.ok(tabs.includes("fontSize: 16, fontWeight: '600'"), 'tab label 16/600');
  assert.ok(screen.includes("fontSize: 20, lineHeight: 26, fontWeight: '700'"), 'section title 20/26/700');
  assert.ok(!screen.includes('adjustsFontSizeToFit') && !header.includes('adjustsFontSizeToFit'), 'no font shrinking');
});

test('video.html: video card has the round play badge and localized short view counts', () => {
  assert.ok(card.includes('<VideoPlayBadge small={compactLayout} />'), 'play badge on the thumbnail');
  assert.ok(kit.includes('rgba(0,0,0,0.5)') && kit.includes('rgba(255,255,255,0.25)'), 'badge colors from `.thumb .pl`');
  assert.ok(views.includes("ru: { thousand: ' тыс.'"), 'ru abbreviation');
  assert.ok(card.includes('formatViewCount(video.viewCount, lang)'), 'card uses the localized formatter');
  assert.ok(!card.includes('duration'), 'no invented duration: the catalog snapshot has none');
});

test('video.html: premiere hero uses glass card, state pill on the frame and mockup buttons', () => {
  assert.ok(hero.includes('liquidGlassTokens(liquidGlassThemeId)'), 'live theme tokens');
  assert.ok(!hero.includes('#A6FF4D') && !hero.includes('#101B18'), 'no lime/green legacy palette');
  assert.ok(hero.includes('testID="youtube-premiere-join"'), 'live state has the join button');
  assert.ok(hero.includes('testID="youtube-premiere-checking"'), 'checking state has the spinner button');
  assert.ok(hero.includes('reminded ? copy.reminded : copy.remind'), 'remind button flips to "Reminder set"');
  assert.ok(screen.includes('reminded={remindedIds.includes(hero.id)}'), 'optimistic reminded state is passed in');
  assert.ok(screen.includes('const rollback = () => setRemindedIds'), 'optimistic reminder rolls back on failure');
  assert.ok(!screen.includes('Alert.alert(copy.reminderSet)'), 'success is shown by the button, not an alert');
});

test('video.html: playlist row and playlist screen follow the mockup', () => {
  assert.ok(row.includes('borderBottomColor: g.line'), 'row separated by a hairline, not a card');
  assert.ok(row.includes('stackOne') && row.includes('stackTwo'), 'stacked cover');
  assert.ok(playlist.includes('liquidGlassTokens(liquidGlassThemeId)'), 'playlist screen on glass tokens');
  assert.ok(playlist.includes('compact'), 'playlist videos use the compact row');
  assert.ok(playlist.includes('testID="youtube-playlist-play-all"'), 'play all stays wired');
  assert.ok(!playlist.includes('#071015'), 'no graphite-only ink');
});

test('video.html: loading, empty, error and note states use the shared glass kit', () => {
  assert.ok(kit.includes('export function VideoStateBlock') && kit.includes('width: 61, height: 61'), 'state tile 61');
  assert.ok(kit.includes('export function VideoNote') && kit.includes('fontSize: 14.5, lineHeight: 19'), 'note 14.5/19');
  assert.ok(screen.includes('testID="youtube-catalog-error"') && screen.includes('actionTestID="youtube-catalog-retry"'), 'error keeps testIDs');
  assert.ok(screen.includes('<VideoNote g={g} icon="cloud-offline-outline"'), 'offline note');
  assert.ok(screen.includes('<VideoNote g={g} icon="flag-outline" text={copy.stale}'), 'stale note');
  assert.ok(screen.includes('SkeletonBlock width="100%" height={skeletonHeight} borderRadius={22}'), 'loading skeleton geometry');
  assert.ok(screen.includes("DebugLogger.error('[VIDEO-TAB]:loadCatalog'"), 'no silent catch on catalog load');
});

test('video packs screen: empty/error states carry the tile and a filled cta', () => {
  assert.ok(packs.includes('styles.stateTile'), 'state tile');
  assert.ok(packs.includes('backgroundColor: g.cta') && packs.includes('color: g.ctaInk'), 'filled cta');
});
