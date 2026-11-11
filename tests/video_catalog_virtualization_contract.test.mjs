import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(new URL('../app/lingman_videos.tsx', import.meta.url), 'utf8');
// зачем (владелец 11.11, «да, перестраивай»): вкладок больше нет — над лентой ряд из четырёх положений (VideoFeedChips).
const chips = readFileSync(new URL('../components/video/VideoFeedFilter.tsx', import.meta.url), 'utf8');
const views = readFileSync(new URL('../app/video_feed_filter.ts', import.meta.url), 'utf8');
const header = readFileSync(new URL('../components/youtube/YoutubeChannelHeader.tsx', import.meta.url), 'utf8');

// зачем (владелец 01.10): вкладки «Все видео» нет — ветки списка всех роликов в экране тоже нет.
test('All videos tab is gone; one real inline player remains', () => {
  assert.ok(!screen.includes("tab === 'all'"), 'no All Videos branch');
  assert.ok(!screen.includes('youtube-catalog-all-videos'), 'no All Videos list');
  assert.ok(views.includes("['all', 'unwatched', 'favorites', 'playlists']"), 'ряд положений: три фильтра роликов и плейлисты, отдельного списка «Все видео» нет');
  assert.ok(screen.includes('hero.id === activeVideoId ? ('), 'one real inline player remains wired (премьера в шапке)');
  assert.ok(screen.includes("pathname: '/lingman_video_watch'"), 'обычный ролик открывается экраном ролика');
});

test('Video chrome follows the reference hierarchy without inert controls', () => {
  assert.ok(chips.includes('minHeight: 44'), 'ряд положений держит зону касания 44');
  assert.ok(!chips.includes('borderBottomWidth') && !chips.includes('borderWidth') && chips.includes('backgroundColor: active ? p.cta : p.control'), 'выбранное положение — заливка главной кнопки, без рамок и подчёркиваний (владелец 11.11)');
  assert.ok(header.includes('styles.channelPill'), 'channel is a labeled pill below the title');
  assert.ok(header.includes('testID="youtube-all-channels"'), 'the channel pill keeps its real action');
  assert.ok(header.includes('accessibilityLabel="YouTube"'), 'the real YouTube action remains available');
  // 05.10 (решение 5): пилюля языка есть, но только с настоящим действием — без onOpenLanguage рисуется YouTube.
  assert.ok(header.includes('onOpenLanguage && studyTarget ?'), 'language pill renders only when it has a real action');
});

test('Video tab strip gives every long localized label a responsive share of a narrow screen', () => {
  // зачем (Сверка video-001, .tabs3): вкладки по ширине текста слева через 22, но сжимаются на узком экране.
  assert.ok(chips.includes('gap: 8'), 'положения идут слева с шагом макета');
  assert.ok(chips.includes('<ScrollView horizontal'), 'на узком экране ряд прокручивается по горизонтали');
  assert.ok(!chips.includes('flexShrink') && !chips.includes('numberOfLines'), 'длинные подписи не сжимаются и не обрезаются — их видно прокруткой');
  assert.ok(chips.includes("playlists: 'Listas'") && chips.includes("unwatched: 'Sin ver'"), 'испанские подписи положений — настоящие переводы');
  assert.ok(chips.includes('paddingHorizontal: V2.screenPad') && chips.includes('marginHorizontal: -V2.screenPad'), 'ряд уходит под поля экрана: последнее положение доступно прокруткой, а не выталкивается за край');
});

test('Video channel pill constrains a long external channel name without hiding its action', () => {
  assert.ok(header.includes("maxWidth: '100%'"), 'pill cannot exceed the screen width');
  assert.ok(header.includes('channelPillContent: { flexDirection'), 'pill keeps a content row');
  // зачем (Сверка video-001): flex:1 в пилюле по содержимому обнулял ширину имени — только сжатие.
  assert.ok(header.includes("channelName: { ...V2_TYPE.body, fontWeight: '700', flexShrink: 1, minWidth: 0 }"), 'external name can shrink within the pill');
  assert.ok(!/channelName: {[^}]*flex: 1/.test(header), 'name never gets flex:1 inside a content-sized pill');
  assert.ok(header.includes('styles.channelChevron'), 'the disclosure chevron keeps a non-shrinking style');
  assert.ok(header.includes('channelAccessibilityLabel'), 'screen readers receive the full current channel name');
});
