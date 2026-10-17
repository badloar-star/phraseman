// зачем (владелец 2026-09-30, темы 2.0): Главная, Шпиль и фон экранов рисуются палитрой V2.
// Сторожим: «Спокойно» тёмное — токены темы; «Акцент» — фон и стекло прежние, цвет темы
// у кнопки и прогресса; «Максимум» — фон в тоне темы и дымка; светлое — светлый фон и тёмный текст.
const test = require('node:test');
const assert = require('node:assert/strict');
require('tsx/cjs');

const { makeLiquidGlassTheme, liquidGlassTokens } = require('../constants/liquidGlassThemePalette.ts');
const { getV2Palette } = require('../constants/v2Style.ts');

const base = { correct: '#47C870', wrong: '#F05454', gold: '#FFC800' };
const v = (level, appearance = 'dark') => ({ level, appearance });
const palette = (id, variant) => getV2Palette(makeLiquidGlassTheme(id, base, variant), 'dark');

// зачем (владелец 01.10: «при смене темы на Главной ничего не меняется»): «Спокойно» тёмное
// берёт фон, карточки и текст из токенов выбранной темы — как все остальные экраны.
test('calm dark V2 palette follows the selected theme tokens', () => {
  const seen = new Set();
  for (const id of ['graphite', 'marine', 'terracotta']) {
    const calm = palette(id, v('calm'));
    const g = liquidGlassTokens(id, v('calm'));
    assert.equal(calm.bg, g.bg, id + ': bg');
    assert.equal(calm.card, g.opaqueCard, id + ': card');
    assert.equal(calm.text, g.text, id + ': text');
    assert.equal(calm.smokeBoost, 1);
    seen.add(calm.bg);
  }
  assert.equal(seen.size, 3, 'each theme has its own Home background');
});

test('accent keeps the calm background and glass, colours CTA and progress', () => {
  for (const id of ['slate', 'sage', 'rose']) {
    const calm = palette(id, v('calm'));
    const acc = palette(id, v('accent'));
    for (const key of ['bg', 'bgTop', 'card', 'glass', 'glassRaised', 'text', 'textSecondary', 'stroke', 'tabBar']) {
      assert.equal(acc[key], calm[key], `${id}: ${key}`);
    }
    const g = liquidGlassTokens(id, v('accent'));
    // зачем (R115, 17.10): заливка главной кнопки палитры — пара ctaFill/ctaFillInk (владелец 13.10 №35: пастельный accent сливался с фоном светлых градиентных тем,
    // кнопка к фону ≥3:1, подпись ≥4,5:1). Раньше ждали сырой accent — ожидание устарело. Уровни по-прежнему различимы: цвет темы живёт в прогрессе, ссылках и значках.
    assert.equal(acc.cta, g.ctaFill);
    assert.equal(acc.ctaText, g.ctaFillInk);
    assert.notEqual(acc.progressFill, calm.progressFill, id + ': Акцент красит прогресс цветом темы, Тон — нет');
    assert.equal(acc.progressFill, g.accentGraphic);
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
  assert.equal(light.cta, g.ctaFill); // зачем (R115, 17.10): заливка главной кнопки — ctaFill, см. выше
});
