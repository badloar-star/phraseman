import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(new URL('../app/lesson_menu.tsx', import.meta.url), 'utf8');

test('lesson menu layers the active Liquid Glass theme behind the real B1–B5 menu', () => {
  assert.ok(screen.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  assert.ok(screen.includes('colors={[lessonMenuGlass.bgTop, lessonMenuGlass.bg, lessonMenuGlass.bgBottom]}'), 'full-bleed liquid background');
  assert.ok(screen.includes('forceFullBleed'), 'background covers the shell safe area');
  assert.ok(screen.includes('insets.bottom + 16'), 'scroll content clears the bottom safe area');
  assert.ok(screen.includes('menuItems.filter(item => !item.hidden).map'), 'real menu item availability remains the data source');
  assert.ok(screen.includes("router.push({ pathname: '/lesson1'"), 'start/continue action keeps its real route');
  assert.ok(screen.includes("router.push({ pathname: '/lesson_words'"), 'words action keeps its real route');
});
