import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(new URL('../app/flashcards_packs.tsx', import.meta.url), 'utf8');
const hub = readFileSync(new URL('../app/flashcards/FlashcardsCategoryHub.tsx', import.meta.url), 'utf8');

test('community catalog uses live 13-theme tokens for static shell and controls', () => {
  assert.match(screen, /liquidGlassThemeId/);
  assert.match(screen, /liquidGlassTokens\(liquidGlassThemeId\)/);
  // зачем (Тень 12.10): кнопки и поле шапки каталога — плашки с тенью темы, без блюр-блика и кромки glassEdge
  assert.doesNotMatch(screen, /CatalogGlass/);
  // зачем (Карточки 2.0, cards-v2 catalog() 12.10): поле поиска и чипы каталога — общие части kit (KitSearchField, PackChips) — плашки с тенью темы, без кромки
  assert.match(screen, /<KitSearchField g=\{g\}/);
  assert.match(screen, /<PackChips g=\{g\}/);
  assert.doesNotMatch(screen, /borderColor: g\.glassEdge/);
});

test('community tiles use tinted translucent material, real diffusion and readable semantic text', () => {
  assert.match(hub, /liquidGlassTokens\(liquidGlassThemeId\)/);
  // зачем (Тень 12.10): строка «Продолжить создание набора» — плашка PlateFill + тень, без кромки glassEdge. Блюра в каталоге больше нет
  // (белый ореол вокруг текста на Android из сверки packs-simple-001 по определению невозможен).
  assert.match(hub, /<PlateFill g=\{g\} radius=\{16\} \/>/);
  assert.match(hub, /boxShadow: plateBoxShadow\(g\)/);
  assert.doesNotMatch(hub, /borderColor: g\.glassEdge/);
  assert.doesNotMatch(hub, /<BlurView/);
  assert.doesNotMatch(hub, /a11y=\{`qa-flashcards-pack-card-/);
});

test('catalog preserves separate real empty versus filtered search states in glass', () => {
  assert.match(hub, /catalogCommunityPacks\.length === 0/);
  assert.match(hub, /Здесь появятся наборы после публикации\./);
  assert.match(hub, /Ничего не нашли/); // cards-v2 catalogNone
  assert.match(hub, /testID="flashcards-community-empty"/);
  assert.match(hub, /boxShadow: nestedBoxShadow\(g\), alignItems: 'center', justifyContent: 'center' \}\}>/);
});
