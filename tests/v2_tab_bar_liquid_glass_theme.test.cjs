const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('tsx/cjs');

const source = fs.readFileSync(path.resolve(__dirname, '../components/v2/V2TabBar.tsx'), 'utf8');
const { liquidGlassTokens, resolveLiquidGlassTheme } = require('../constants/liquidGlassThemePalette.ts');

test('live tab bar takes surface, rim, cap and labels from the selected glass theme', () => {
  assert.match(source, /const\s+\{\s*liquidGlassThemeId\s*\}\s*=\s*useTheme\(\)/);
  assert.match(source, /const palette = liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /backgroundColor:\s*Platform\.OS === 'android' \? palette\.bgBottom/);
  // зачем (владелец 12.10, стиль «Тень»): ободка капсулы больше нет — бар отделяют тон стекла темы и внешняя тень.
  assert.doesNotMatch(source, /<BarRim/);
  // зачем (темы 2.0): капсула и активный значок — роли цвета темы; в «Спокойно» они равны cta (проверено ниже).
  assert.match(source, /<CapFill\s+width=\{slotW\}\s+color=\{palette\.accentCap\}/);
  assert.match(source, /const color = on \? palette\.accentBright/);
  assert.match(source, /palette\.mutedText/);
  assert.doesNotMatch(source, /const\s+(?:COLOR|GLASS_FILL)\s*=/);
});

// зачем (владелец 29.09 → 22.10): без «Сцены» таббар без подписей — крупные значки, название вкладки только для экранного чтеца; со
// «Сценой» подписи вкладок вернулись решением 9f6f56bce / c74ed3740 (макет scenes-compact): одна строка, рост шрифта не выше 1,2, цвет —
// токены темы (у активной в светлой — accentText, иначе accentBright / mutedText).
test('tab bar: enlarged icons and screen-reader label; scene tab labels are one line, scale ≤ 1.2, theme-token colours', () => {
  const texts = source.match(/<Text[\s>][^\n]*/g) ?? [];
  assert.equal(texts.length, 1, 'единственная подпись — подпись вкладки сцены');
  assert.match(texts[0], /^<Text numberOfLines=\{1\} maxFontSizeMultiplier=\{([\d.]+)\} style=\{\[s\.tabLabel, \{ color: on && palette\.isLight \? palette\.accentText : color \}\]\}>\{item\.label\}<\/Text>/);
  const scale = Number(/maxFontSizeMultiplier=\{([\d.]+)\}/.exec(texts[0])?.[1]);
  assert.ok(scale > 0 && scale <= 1.2, `maxFontSizeMultiplier ${scale}`);
  assert.match(source, /\{HOME_SCENE_V2_ENABLED \? <Text numberOfLines=\{1\}/);
  assert.match(source, /const color = on \? palette\.accentBright/);
  assert.doesNotMatch(source, /\bs\.label\b/);
  const size = Number(/const ICON_SIZE = (\d+);/.exec(source)?.[1]);
  assert.ok(size >= 28, `ICON_SIZE ${size}`);
  assert.match(source, /accessibilityLabel=\{item\.label\}/);
  assert.match(source, /tab:\s*\{\s*flex: 1, alignItems: 'center', justifyContent: 'center'\s*\}/);
});

test('a tint changes the tab bar material and stays without Plus (themes are free)', () => {
  const graphite = liquidGlassTokens('graphite');
  for (const id of ['iris', 'marine']) {
    const tint = liquidGlassTokens(id);
    for (const role of ['bgBottom', 'opaqueControl', 'cta', 'mutedText']) {
      assert.notEqual(tint[role], graphite[role], `${id}: ${role}`);
    }
    assert.equal(liquidGlassTokens(resolveLiquidGlassTheme(id, false)).bgBottom, tint.bgBottom);
  }
});

// зачем (владелец 2026-09-30, темы 2.0): в «Спокойно» таббар ровно прежний, в «Акценте» капсула
// и активный значок получают цвет темы, фон таббара остаётся прежним.
test('calm keeps the neutral capsule; accent colours capsule and active icon only', () => {
  for (const id of ['graphite', 'slate', 'terracotta', 'marine']) {
    const calm = liquidGlassTokens(id, { level: 'calm', appearance: 'dark' });
    const acc = liquidGlassTokens(id, { level: 'accent', appearance: 'dark' });
    assert.equal(calm.accentCap, calm.cta, id);
    assert.equal(calm.accentBright, calm.cta, id);
    assert.notEqual(acc.accentCap, calm.cta, id);
    assert.equal(acc.bgBottom, calm.bgBottom, id);
    assert.equal(acc.opaqueControl, calm.opaqueControl, id);
  }
});
