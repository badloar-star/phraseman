import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const lessons = readFileSync(new URL('../app/(tabs)/lessons.tsx', import.meta.url), 'utf8');

test('legacy lesson list resolves the active Liquid Glass theme above its real list data', () => {
  assert.ok(lessons.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  assert.ok(lessons.includes('colors={[learnGlass.bgTop, learnGlass.bg, learnGlass.bgBottom]}'), 'full-bleed themed background');
  assert.ok(lessons.includes('<ScreenGradient forceFullBleed>'), 'legacy catalog inherits the themed full-bleed shell');
  assert.ok(lessons.includes('borderColor: learnGlass.glassEdge'), 'header controls use a glass edge');
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
