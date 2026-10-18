import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const screen = read('app/lingman_videos.tsx');
const playlist = read('app/lingman_playlist.tsx');
const kit = read('components/video/VideoGlassKit.tsx');
const hero = read('components/youtube/YoutubePremiereHero.tsx');
const card = read('components/youtube/YoutubeVideoCard.tsx');
const row = read('components/youtube/YoutubePlaylistGridCard.tsx');
const header = read('components/youtube/YoutubeChannelHeader.tsx');
const tabs = read('components/youtube/YoutubeChannelTabs.tsx');
const packs = read('app/flashcards_video_packs.tsx');
const views = read('components/video/formatViewCount.ts');

test('video-redesign #c1: «Наборы» — третья вкладка, а не плашка сверху', () => {
  // зачем (владелец 11.10): плашка «Наборы из видео» заменена вкладкой; список тот же экран наборов (режим embedded).
  assert.ok(!screen.includes('testID="video-tab-packs-row"'), 'плашки наборов сверху больше нет');
  assert.ok(screen.includes("tab === 'packs' && !savedOnly") && screen.includes('<FlashcardsVideoPacksScreen embedded'), 'вкладка встраивает экран наборов');
  assert.ok(screen.includes('<YoutubeChannelTabs value={tab} onChange={changeTab} />'), 'tabs are drawn in every state');
});

test('video.html: header pill has avatar/initials, tabs are 16/600', () => {
  assert.ok(header.includes('testID="youtube-channel-avatar"'), 'channel avatar in the pill');
  assert.ok(header.includes('avatarText'), 'initials fallback');
  assert.ok(tabs.includes("fontSize: 16, fontWeight: '600'"), 'tab label 16/600');
  assert.ok(!screen.includes('adjustsFontSizeToFit') && !header.includes('adjustsFontSizeToFit'), 'no font shrinking');
});

test('video.html: video card has the round play badge and localized short view counts', () => {
  assert.ok(card.includes('<VideoPlayBadge small={compactLayout} />'), 'play badge on the thumbnail');
  // зачем (Тень 12.10): значок «play» без белого кольца 0.25 — только тёмная заливка `.thumb .pl` и малая тень
  assert.ok(kit.includes('rgba(0,0,0,0.5)') && !kit.includes('rgba(255,255,255,0.25)') && kit.includes('nestedBoxShadow(g)'), 'badge fill from `.thumb .pl`, no ring');
  assert.ok(views.includes("ru: { thousand: ' тыс.'"), 'ru abbreviation');
  assert.ok(card.includes('formatViewCount(video.viewCount, lang)'), 'card uses the localized formatter');
  // зачем (05.10, 84418b35d): длительность теперь приходит из каталога (durationSec) — показываем только её, без вымысла.
  assert.ok(card.includes('formatVideoDuration(video.durationSec)'), 'duration only from the catalog durationSec');
  assert.ok(card.includes('{duration ? <View style={styles.duration}'), 'no badge when the catalog has no duration');
  assert.ok(!/duration\s*[:=]\s*['"`]\d/.test(card), 'no hard-coded duration text');
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
  assert.ok(row.includes('stackOne') && row.includes('stackTwo'), 'stacked cover');
  assert.ok(row.includes('testID="youtube-playlist-row"'), 'playlist tile keeps its testID');
  assert.ok(playlist.includes('liquidGlassTokens(liquidGlassThemeId)'), 'playlist screen on glass tokens');
  assert.ok(playlist.includes('compact'), 'playlist videos use the compact row');
  assert.ok(playlist.includes('testID="youtube-playlist-play-all"'), 'play all stays wired');
  assert.ok(!playlist.includes('#071015'), 'no graphite-only ink');
});

test('video.html: loading, empty, error and note states use the shared glass kit', () => {
  assert.ok(kit.includes('export function VideoStateBlock') && kit.includes('width: 61, height: 61'), 'state tile 61');
  assert.ok(kit.includes('export function VideoNote') && kit.includes('fontSize: 16, lineHeight: 21'), 'note 16/21 (D145)');
  assert.ok(!screen.includes('testID="youtube-catalog-error"') && !screen.includes('youtube-catalog-retry'), 'владелец 01.10: ни ошибки, ни retry');
  assert.ok(!screen.includes('<VideoNote'), 'владелец 01.10: ни offline, ни stale плашек');
  // зачем (video-redesign #c1): первый кадр — сетка в две колонки, геометрия скелета = геометрия карточек.
  assert.ok(screen.includes('SkeletonBlock width="100%" height={coverHeight} borderRadius={14}'), 'loading skeleton geometry');
  assert.ok(screen.includes("DebugLogger.error('[VIDEO-TAB]:loadCatalog'"), 'no silent catch on catalog load');
});

test('video packs screen: empty/error states carry the tile and a filled cta', () => {
  // зачем: пустые состояния рисует общий KitEmpty (плитка 61, мятная кнопка) — макет cards-section
  assert.ok(packs.includes('KitEmpty'), 'state tile');
  assert.ok(packs.includes('actionTestID="fc-video-packs-clear-search"') && !packs.includes('fc-video-packs-try-again'), 'filled cta (поиск без результатов); экрана-ошибки с «Попробовать снова» нет — правило владельца 18.10');
});
