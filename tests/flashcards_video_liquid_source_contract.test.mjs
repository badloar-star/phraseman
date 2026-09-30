import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const screen = readFileSync(join(root, 'app/flashcards_video_packs.tsx'), 'utf8');
const row = readFileSync(join(root, 'app/flashcards/VideoPackRow.tsx'), 'utf8');

test('Video packs preserves real catalog, staging, sort, language and social actions', () => {
  for (const token of ['loadVideoMarketPacks(studyTarget, { forceRemote })', 'filterVideoPacks(catalog)', 'applyCommunityPacksFilter(packs, query, sort, packLanguage)', 'stageCommunityPackCardsForNavigation(pack.id, studyTarget, pack)', "preview: '1', from: 'video'", 'CommunityPackSocialBar', 'getTrustedLingmanYoutubeUrl']) {
    assert.ok((screen + row).includes(token), `missing live behavior: ${token}`);
  }
});

test('Video list and row use current translucent theme material with native diffusion', () => {
  for (const source of [screen, row]) {
    assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
    assert.match(source, /dimezisBlurView/);
    assert.match(source, /g\.glassEdge/);
  }
  assert.match(screen, /colors=\{\[g\.bgTop, g\.bg, g\.bgBottom\]\}/);
});

test('Video retains distinct loading, error, empty and search states without clipped titles', () => {
  for (const token of ["'loading' | 'ready' | 'error'", "loadState === 'loading'", "loadState === 'error'", 'searching ? copy.notFoundTitle : copy.emptyTitle', 'fc-video-packs-retry', 'fc-video-packs-clear-search', 'THUMB_W = 112', 'THUMB_H = 63']) {
    assert.ok((screen + row).includes(token), `missing state: ${token}`);
  }
  assert.match(row, /<FlowText/);
  assert.doesNotMatch(row, /numberOfLines=/);
});

test('Video retry visibly reloads and bypasses the warm catalog cache once', () => {
  assert.match(screen, /consumeVideoCatalogRetryTarget\(retryTargetKeyRef\.current, targetKey\)/);
  assert.match(screen, /loadVideoMarketPacks\(studyTarget, \{ forceRemote \}\)/);
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
