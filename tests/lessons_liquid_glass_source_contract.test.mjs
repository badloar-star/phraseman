import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const lessons = readFileSync(new URL('../app/(tabs)/lessons.tsx', import.meta.url), 'utf8');

test('legacy lesson list resolves the active Liquid Glass theme above its real list data', () => {
  assert.ok(lessons.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  // R69 (Сверка 15.10): градиент страницы начинается прозрачным (фон оболочки без шва под статус-баром), затем те же тона темы
  assert.ok(lessons.includes('colors={[alphaHex(learnGlass.bgTop, 0), learnGlass.bgTop, learnGlass.bg, learnGlass.bgBottom]}'), 'full-bleed themed background');
  assert.ok(lessons.includes('locations={[0, 0.1, 0.55, 1]}'), 'themed background starts transparent, no seam under the status bar');
  assert.ok(lessons.includes('<ScreenGradient forceFullBleed bleedTop={isRetainedTab ? insets.top : 0}>'), 'legacy catalog keeps its themed full-bleed canvas, lifted over the safe area to match the shell (R69)');
  // зачем (стиль «Тень» 12.10, координатор: красные сторожи): круглые кнопки шапки без кромки, с малой тенью.
  assert.ok(lessons.includes('boxShadow: nestedBoxShadow(learnGlass)'), 'header controls use the nested shadow');
  assert.ok(!lessons.includes('borderColor: learnGlass.glassEdge'), 'header controls have no glass edge');
  assert.ok(lessons.includes('data={legacyFilteredListData}'), 'real filtered lesson data remains the list source');
  assert.ok(lessons.includes('router.push({ pathname: "/lesson_menu", params: { id: num } })'), 'real lesson route remains wired');
});

test('legacy lesson list keeps the Liquid Glass gradient visible instead of masking it with an opaque page', () => {
  assert.ok(lessons.includes('style={{ flex: 1, backgroundColor: "transparent" }}'), 'main content remains transparent over the full-bleed gradient');
  const catalogStart = lessons.indexOf('testID="legacy-lessons-catalog"');
  const catalogEnd = lessons.indexOf('testID="legacy-lessons-level-rail"', catalogStart);
  const catalogBlock = lessons.slice(catalogStart, catalogEnd);
  assert.ok(catalogStart >= 0 && catalogEnd > catalogStart, 'catalog block is present');
  assert.ok(catalogBlock.includes('style={{ flex: 1, backgroundColor: "transparent" }}'), 'legacy catalog remains transparent over the full-bleed gradient');
  assert.ok(!lessons.includes('backgroundColor: page === "dialogs" ? "transparent" : learnGlass.bg'), 'main gradient is not masked on the catalog page');
  assert.ok(!catalogBlock.includes('backgroundColor: learnGlass.bg'), 'catalog is not masked by a duplicate Liquid Glass fill');
  assert.ok(!catalogBlock.includes('backgroundColor: t.bgPrimary'), 'catalog is not masked by the legacy theme fill');
});
