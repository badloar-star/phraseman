import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('app/settings_themes.tsx', 'utf8');

// Шесть особых тем стоят первыми без отдельного маркетингового заголовка.
// В store они открываются достижениями; debug открывает их для визуальной сверки.
test('special themes lead the list and store locks disclose numeric progress', () => {
  assert.doesNotMatch(source, /candidateLocked/);
  assert.doesNotMatch(source, /premium_modal/);
  assert.doesNotMatch(source, /PlusBadge/);
  assert.doesNotMatch(source, /sub=\{item\.mode === 'graphite' \? standardLabel : 'Plus'\}/);
  // 2026-09-30 (темы 2.0): кнопки «Применить» больше нет — тап по теме применяет её сразу.
  assert.doesNotMatch(source, /theme-cta/);
  assert.match(source, /setLiquidGlassThemeId\(mode\)/);
  assert.match(source, /PREMIUM_GRADIENT_OPTIONS/);
  assert.doesNotMatch(source, /premium-theme-section-title/);
  assert.match(source, /useScrollToSelectedTheme\(null\)/);
  assert.match(source, /available=\{__DEV__ \|\| isLiquidGlassThemeAvailable\(item\.mode\)\}/);
  assert.match(source, /theme-tile-details-/);
  assert.match(source, /progressByCondition/);
  assert.match(source, /claimPremiumThemeCondition/);
  assert.doesNotMatch(source, /premiumThemeProgressUnavailable/);
  assert.doesNotMatch(source, /#F2F1F6/);
  assert.doesNotMatch(source, /#C9CBD2/);
});
