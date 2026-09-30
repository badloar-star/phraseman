const test = require('node:test');
const assert = require('node:assert/strict');
require('tsx/cjs');

const {
  LIQUID_GLASS_THEME_IDS,
  liquidGlassTokens,
  makeLiquidGlassTheme,
  resolveLiquidGlassTheme,
} = require('../constants/liquidGlassThemePalette.ts');

const base = {
  correct: '#47C870', correctBg: 'rgba(71,200,112,0.16)',
  wrong: '#F05454', wrongBg: 'rgba(240,84,84,0.12)',
  gold: '#FFC800', goldBg: 'rgba(255,200,0,0.14)',
  correctText: '#042010', textOnGold: '#1A1A1A',
};

function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}

test('approved registry has graphite plus twelve distinct dark tints', () => {
  assert.deepEqual(LIQUID_GLASS_THEME_IDS, [
    'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
    'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
  ]);
  assert.equal(new Set(LIQUID_GLASS_THEME_IDS).size, 13);
  assert.equal(liquidGlassTokens('graphite').bg, '#0C0D10');
  assert.equal(liquidGlassTokens('unknown').bg, '#0C0D10');
  for (const id of LIQUID_GLASS_THEME_IDS) {
    const tokens = liquidGlassTokens(id);
    assert.ok(luminance(tokens.bg) < .035, `${id}: background must stay dark`);
    assert.ok((luminance(tokens.cta) + .05) / (luminance(tokens.ctaInk) + .05) >= 4.5, `${id}: CTA contrast`);
  }
});

test('Plus expiry immediately resolves a tinted selection to free graphite', () => {
  assert.equal(resolveLiquidGlassTheme('marine', true), 'marine');
  assert.equal(resolveLiquidGlassTheme('marine', false), 'graphite');
  assert.equal(resolveLiquidGlassTheme('graphite', false), 'graphite');
  assert.equal(resolveLiquidGlassTheme('retired-theme', true), 'graphite');
});

test('app mapping only tints neutral roles and preserves success, error and rewards', () => {
  for (const id of LIQUID_GLASS_THEME_IDS) {
    const theme = makeLiquidGlassTheme(id, base);
    for (const key of Object.keys(base)) assert.equal(theme[key], base[key], `${id}: ${key}`);
    assert.equal(theme.bgPrimary, liquidGlassTokens(id).bg);
    assert.equal(theme.accent, liquidGlassTokens(id).cta);
    assert.equal(theme.textPrimary, liquidGlassTokens(id).text);
  }
});
