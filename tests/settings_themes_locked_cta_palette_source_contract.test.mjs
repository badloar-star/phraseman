import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('app/settings_themes.tsx', 'utf8');

// зачем (владелец 2026-09-30): «ТЕМЫ ВСЕ ФРИ, БЕЗ ПЛЮСА МОЖНО МЕНЯТЬ». Прежний сторож
// проверял замок и переход на пейвол — теперь он сторожит, что их больше нет.
test('any theme applies on tap without Plus; no apply button, no hardcoded neutrals', () => {
  assert.doesNotMatch(source, /candidateLocked/);
  assert.doesNotMatch(source, /premium_modal/);
  assert.doesNotMatch(source, /PlusBadge/);
  assert.doesNotMatch(source, /isLiquidGlassThemeAvailable/);
  assert.doesNotMatch(source, /sub=\{item\.mode === 'graphite' \? standardLabel : 'Plus'\}/);
  // 2026-09-30 (темы 2.0): кнопки «Применить» больше нет — тап по теме применяет её сразу.
  assert.doesNotMatch(source, /theme-cta/);
  assert.match(source, /setLiquidGlassThemeId\(mode\)/);
  assert.doesNotMatch(source, /#F2F1F6/);
  assert.doesNotMatch(source, /#C9CBD2/);
});
