import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(new URL('../app/lingman_videos.tsx', import.meta.url), 'utf8');
const tabs = readFileSync(new URL('../components/youtube/YoutubeChannelTabs.tsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../components/youtube/YoutubeChannelHeader.tsx', import.meta.url), 'utf8');

// зачем (владелец 01.10): вкладки «Все видео» нет — ветки списка всех роликов в экране тоже нет.
test('All videos tab is gone; one real inline player remains', () => {
  assert.ok(!screen.includes("tab === 'all'"), 'no All Videos branch');
  assert.ok(!screen.includes('youtube-catalog-all-videos'), 'no All Videos list');
  assert.ok(!tabs.includes("'all'"), 'no all tab in the type');
  assert.ok(screen.includes('inlinePlayer={video.id === activeVideoId ? ('), 'one real inline player remains wired');
});

test('Video chrome follows the reference hierarchy without inert controls', () => {
  assert.ok(tabs.includes('minHeight: 44'), 'each tab keeps a 44pt touch target');
  assert.ok(tabs.includes('borderBottomWidth: 2'), 'active tab is an underline, not a segmented fill');
  assert.ok(header.includes('styles.channelPill'), 'channel is a labeled pill below the title');
  assert.ok(header.includes('testID="youtube-all-channels"'), 'the channel pill keeps its real action');
  assert.ok(header.includes('accessibilityLabel="YouTube"'), 'the real YouTube action remains available');
  // 05.10 (решение 5): пилюля языка есть, но только с настоящим действием — без onOpenLanguage рисуется YouTube.
  assert.ok(header.includes('onOpenLanguage && studyTarget ?'), 'language pill renders only when it has a real action');
});

test('Video tab strip gives every long localized label a responsive share of a narrow screen', () => {
  // зачем (Сверка video-001, .tabs3): вкладки по ширине текста слева через 22, но сжимаются на узком экране.
  assert.ok(tabs.includes('gap: 22'), 'tabs sit left with the mockup gap');
  assert.ok(tabs.includes('flexShrink: 1'), 'every tab may shrink on a narrow screen');
  assert.ok(tabs.includes("minWidth: 0"), 'long labels may shrink and wrap instead of overflowing');
  assert.ok(tabs.includes("Listas de reproducción"), 'the long Spanish playlist label remains a real localized label');
  assert.ok(!tabs.includes('marginRight: 10'), 'inter-tab fixed gaps cannot push the third tab off-screen');
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
