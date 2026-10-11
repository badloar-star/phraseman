import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(new URL('../app/lingman_videos.tsx', import.meta.url), 'utf8');
const tabs = readFileSync(new URL('../components/youtube/YoutubeChannelTabs.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../components/youtube/YoutubeVideoCard.tsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../components/youtube/YoutubeChannelHeader.tsx', import.meta.url), 'utf8');

// зачем (владелец 01.10): видимых вкладок две — «Все видео» убрана.
test('channel tabs are live on the same catalog', () => {
  assert.ok(tabs.includes("'home' | 'playlists'"), 'two-tab state type');
  assert.ok(tabs.includes("['home', 'playlists']"), 'two visible tab buttons');
  assert.ok(!screen.includes("tab === 'all'"), 'no All Videos branch');
  // зачем (FINAL_PHASE п.4): ролики Главной вкладки — виртуальный список по реальному каталогу.
  assert.ok(screen.includes('savedOnly ? savedVideos : allVideos.filter') && screen.includes('data={homeListVideos}'), 'Home renders real catalog data');
  assert.ok(card.includes('compact?: boolean'), 'card supports approved compact All Videos row');
  assert.ok(card.includes('width: 150'), 'compact row retains 150px thumbnail width');
});

test('video channel uses active 13-theme glass without replacing real thumbnails or playback', () => {
  assert.ok(screen.includes('liquidGlassTokens(liquidGlassThemeId)'), 'live theme tokens in screen');
  assert.ok(tabs.includes('liquidGlassTokens(liquidGlassThemeId)'), 'live theme tokens in tabs');
  assert.ok(card.includes('liquidGlassTokens(liquidGlassThemeId)'), 'live theme tokens in cards');
  assert.ok(header.includes('liquidGlassTokens(liquidGlassThemeId)'), 'live theme tokens in channel actions');
  assert.ok(card.includes('video.thumbnailUrl'), 'real thumbnail source');
  assert.ok(screen.includes('<YoutubeInlinePlayer'), 'real inline player stays wired');
  assert.ok(screen.includes('VideoScreenGlass tint={g.selected}'), 'static screen material');
  assert.ok(!screen.includes('testID="youtube-catalog-error"'), 'владелец 01.10: экрана ошибки нет');
  // зачем: состояния «нет сети / устарел / ошибка» переехали в components/video/VideoGlassKit (макет video.html).
  const kit = readFileSync(new URL('../components/video/VideoGlassKit.tsx', import.meta.url), 'utf8');
  assert.ok(kit.includes('{ backgroundColor: g.card, borderColor: g.glassEdge }'), 'note surface uses current tint');
  assert.ok(kit.includes('styles.stateActionText, { color: g.accentInk }'), 'retry label follows current theme CTA');
  assert.ok(!kit.includes("color: '#071015'"), 'retry label has no graphite-only fallback');
  assert.ok(screen.includes('paddingBottom: tabContentBottomPad'), 'tab content clears bottom navigation');
  // 05.10 (владелец, решение 5): пилюля языка video.html `.lang` перенесена и РАБОЧАЯ — ведёт на выбор
  // языка обучения (канал задаётся языком); кнопка YouTube остаётся там, где пилюли нет.
  assert.ok(header.includes('onOpenChannels'), 'channel action remains wired');
  assert.ok(header.includes('onOpenYoutube'), 'YouTube action remains wired');
  assert.ok(header.includes('onOpenLanguage'), 'language pill is wired');
  // 11.10 (баг владельца, TG-A30B81C181C4): /settings_language — это язык ИНТЕРФЕЙСА; прежняя проверка сторожила
  // ошибку. Пилюля открывает шторку «Язык изучения» (PRF-23).
  assert.ok(!screen.includes("router.push('/settings_language' as any)"), 'language pill must not open the interface-language screen');
  assert.ok(screen.includes('setStudyLanguageSheetVisible(true)') && screen.includes('<StudyLanguageSheet'), 'language pill opens the study-language sheet');
});
