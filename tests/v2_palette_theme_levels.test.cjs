// зачем (владелец 2026-09-30, темы 2.0): Главная, Шпиль и фон экранов рисуются палитрой V2.
// Сторожим: «Спокойно» тёмное — прежняя палитра; «Акцент» — фон и стекло прежние, цвет темы
// у кнопки и прогресса; «Максимум» — фон в тоне темы и дымка; светлое — светлый фон и тёмный текст.
const test = require('node:test');
const assert = require('node:assert/strict');
require('tsx/cjs');

const { makeLiquidGlassTheme, liquidGlassTokens } = require('../constants/liquidGlassThemePalette.ts');
const { getV2Palette } = require('../constants/v2Style.ts');

const base = { correct: '#47C870', wrong: '#F05454', gold: '#FFC800' };
const v = (level, appearance = 'dark') => ({ level, appearance });
const palette = (id, variant) => getV2Palette(makeLiquidGlassTheme(id, base, variant), 'dark');

test('calm dark V2 palette is unchanged by the level machinery', () => {
  for (const id of ['graphite', 'marine', 'terracotta']) {
    const calm = palette(id, v('calm'));
    const plain = getV2Palette({ ...makeLiquidGlassTheme(id, base, v('calm')) }, 'dark');
    assert.deepEqual(calm, plain);
    assert.equal(calm.smokeBoost, 1);
  }
});

test('accent keeps the calm background and glass, colours CTA and progress', () => {
  for (const id of ['slate', 'sage', 'rose']) {
    const calm = palette(id, v('calm'));
    const acc = palette(id, v('accent'));
    for (const key of ['bg', 'bgTop', 'card', 'glass', 'glassRaised', 'text', 'textSecondary', 'stroke', 'tabBar']) {
      assert.equal(acc[key], calm[key], `${id}: ${key}`);
    }
    const g = liquidGlassTokens(id, v('accent'));
    assert.equal(acc.cta, g.accent);
    assert.equal(acc.ctaText, g.accentInk);
    assert.equal(acc.progressFill, g.accent);
    assert.equal(acc.accentText, g.accentText);
  }
});

test('max tints background and glass, boosts smoke; light flips to light surfaces', () => {
  const calm = palette('marine', v('calm'));
  const max = palette('marine', v('max'));
  assert.notEqual(max.bg, calm.bg);
  assert.ok(max.smokeBoost > 1);
  const light = palette('marine', v('accent', 'light'));
  const g = liquidGlassTokens('marine', v('accent', 'light'));
  assert.equal(light.bg, g.bg);
  assert.equal(light.text, g.text);
  assert.equal(light.card, g.opaqueCard);
  assert.equal(light.cta, g.accent);
});
