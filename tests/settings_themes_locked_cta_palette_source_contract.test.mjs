import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('app/settings_themes.tsx', 'utf8');

// зачем (владелец 2026-09-30): «ТЕМЫ ВСЕ ФРИ, БЕЗ ПЛЮСА МОЖНО МЕНЯТЬ». Прежний сторож
// проверял замок и переход на пейвол — теперь он сторожит, что их больше нет.
test('theme CTA applies any theme without Plus and keeps the candidate theme material', () => {
  assert.doesNotMatch(source, /candidateLocked/);
  assert.doesNotMatch(source, /premium_modal/);
  assert.doesNotMatch(source, /PlusBadge/);
  assert.doesNotMatch(source, /isLiquidGlassThemeAvailable/);
  assert.doesNotMatch(source, /sub=\{item\.mode === 'graphite' \? standardLabel : 'Plus'\}/);
  assert.match(source, /backgroundColor: candidateApplied \? candidatePalette\.accentBg : candidatePalette\.accent/);
  assert.doesNotMatch(source, /#F2F1F6/);
  assert.doesNotMatch(source, /#C9CBD2/);
});
