import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(new URL('../app/flashcards_packs.tsx', import.meta.url), 'utf8');
const hub = readFileSync(new URL('../app/flashcards/FlashcardsCategoryHub.tsx', import.meta.url), 'utf8');

test('community catalog uses live 13-theme tokens for static shell and controls', () => {
  assert.match(screen, /liquidGlassThemeId/);
  assert.match(screen, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(screen, /<CatalogGlass/);
  assert.match(screen, /backgroundColor: g\.card/);
  assert.match(screen, /borderColor: g\.glassEdge/);
  assert.match(screen, /dimezisBlurView/);
});

test('community tiles use tinted translucent material, real diffusion and readable semantic text', () => {
  assert.match(hub, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(hub, /<CatalogTileGlass/);
  assert.match(hub, /backgroundColor: g\.card/);
  assert.match(hub, /borderColor: g\.glassEdge/);
  // зачем (сверка packs-simple-001, 04.10): на Android dimezisBlurView в строках каталога давал белый ореол вокруг
  // текста строки (захват собственного содержимого). Размытие строк каталога — без этого метода на всех платформах.
  assert.match(hub, /<BlurView[^>]*experimentalBlurMethod="none"/);
  assert.doesNotMatch(hub, /experimentalBlurMethod=\{[^}]*'dimezisBlurView'/);
  assert.doesNotMatch(hub, /a11y=\{`qa-flashcards-pack-card-/);
});

test('catalog preserves separate real empty versus filtered search states in glass', () => {
  assert.match(hub, /catalogCommunityPacks\.length === 0/);
  assert.match(hub, /Здесь появятся наборы после публикации\./);
  assert.match(hub, /Ничего не найдено\./);
  assert.match(hub, /testID="flashcards-community-empty"/);
  assert.match(hub, /<CatalogTileGlass g=\{g\} \/>/);
});
