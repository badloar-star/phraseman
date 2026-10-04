import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const screen = readFileSync(join(root, 'app/flashcards_video_packs.tsx'), 'utf8');
const row = readFileSync(join(root, 'app/flashcards/VideoPackRow.tsx'), 'utf8');

test('Video packs preserves real catalog, staging, sort, language and social actions', () => {
  for (const token of ['loadVideoPhraseSetPacks({ forceRemote })', 'isVideoPhraseSetPackId(pack.id)', 'filterVideoPacks(catalog)', 'applyCommunityPacksFilter(packs, query, sort, packLanguage)', 'stageCommunityPackCardsWithSilentRetry(pack.id, studyTarget, pack', "preview: '1', from: 'video'", 'CommunityPackSocialBar', 'getTrustedLingmanYoutubeUrl']) {
    assert.ok((screen + row).includes(token), `missing live behavior: ${token}`);
  }
});

test('Video list and row use current translucent theme material with native diffusion', () => {
  for (const source of [screen, row]) {
    assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
    // зачем: строка набора — плоская (макет video-packs-from-video-mockup.html), блюр только у экрана; кромка — у обоих.
    if (source === screen) assert.match(source, /dimezisBlurView/);
    // зачем (макет cards-section «Из видео»): строка — KitCard (кромка внутренними тенями), экран — токены 2.0
    if (source === screen) assert.match(source, /useLv2Glass/);
    else assert.match(source, /KitCard/);
  }
  assert.match(screen, /colors=\{\[g\.bgTop, g\.bg, g\.bgBottom\]\}/);
});

// зачем (владелец 01.10): «Из видео» никогда не пустой и без экранов ошибок — места строк + тихий повтор;
// «Ничего не нашли» остаётся только для поиска.
test('Video shows rows or row placeholders with silent retry, never an error or empty card', () => {
  assert.doesNotMatch(screen, /fc-video-packs-retry/);
  assert.doesNotMatch(screen, /copy.errorTitle|copy.emptyTitle/);
  assert.match(screen, /silentRetryRef/);
  assert.match(screen, /fc-video-packs-title/);
  for (const token of ["'loading' | 'ready' | 'error'", 'fc-video-packs-clear-search', 'THUMB_W = 112', 'THUMB_H = 63']) {
    assert.ok((screen + row).includes(token), `missing state: ${token}`);
  }
  assert.match(row, /<FlowText/);
  assert.doesNotMatch(row, /numberOfLines=/);
});

test('Video retry visibly reloads and bypasses the warm catalog cache once', () => {
  assert.match(screen, /consumeVideoCatalogRetryTarget\(retryTargetKeyRef\.current, targetKey\)/);
  // зачем (владелец 01.10): источник «Из видео» — готовые наборы фраз роликов (video_phrase_sets).
  assert.match(screen, /loadVideoPhraseSetPacks\(\{ forceRemote \}\)/);
  assert.match(screen, /retryTargetKeyRef\.current = targetKey;/);
  assert.match(screen, /transitionVideoCatalogState\(current, targetKey, 'loading'\)/);
  assert.doesNotMatch(screen, /forceRemote: reloadTick > 0/);
});

test('Video row exposes separate accessible video, pack and social controls', () => {
  assert.match(row, /<View[^>]*style=\{\[?styles\.row/s);
  assert.match(row, /video-pack-open-/);
  assert.match(row, /video-pack-play-/);
  assert.match(row, /accessibilityLabel=\{`\$\{title\}/);
});
