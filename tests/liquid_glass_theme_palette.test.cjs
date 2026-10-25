const test = require('node:test');
const assert = require('node:assert/strict');
require('tsx/cjs');

const {
  LIQUID_GLASS_THEME_IDS,
  liquidGlassTokens,
  makeLiquidGlassTheme,
  resolveLiquidGlassTheme,
} = require('../constants/liquidGlassThemePalette.ts');

// зачем (темы 2.0, 10.10): к 13 тонированным темам добавлены 10 градиентных (grad_*) со своими формулами и своим сторожем
// (theme_gradient_themes.test.ts). Этот сторож — про тонированный реестр, поэтому перебирает только его.
const TINT_IDS = LIQUID_GLASS_THEME_IDS.filter((id) => !String(id).startsWith('grad_'));

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
  assert.deepEqual(TINT_IDS, [
    'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
    'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
  ]);
  assert.equal(new Set(TINT_IDS).size, 13);
  // зачем (координатор 25.10): премиум-темы видимые (выбор тем, награды за достижения) — в реестре 23 + 6 = 29
  assert.equal(LIQUID_GLASS_THEME_IDS.length, 29);
  assert.equal(liquidGlassTokens('graphite').bg, '#0C0D10');
  assert.equal(liquidGlassTokens('unknown').bg, '#0C0D10');
  for (const id of TINT_IDS) {
    const tokens = liquidGlassTokens(id);
    assert.ok(luminance(tokens.bg) < .035, `${id}: background must stay dark`);
    assert.ok((luminance(tokens.cta) + .05) / (luminance(tokens.ctaInk) + .05) >= 4.5, `${id}: CTA contrast`);
  }
});

// зачем (владелец 2026-09-30): «ТЕМЫ ВСЕ ФРИ» — Plus больше не решает, какая тема доступна.
test('every registered tint is free; only unknown names fall back to graphite', () => {
  assert.equal(resolveLiquidGlassTheme('marine', true), 'marine');
  assert.equal(resolveLiquidGlassTheme('marine', false), 'marine');
  assert.equal(resolveLiquidGlassTheme('marine'), 'marine');
  assert.equal(resolveLiquidGlassTheme('graphite', false), 'graphite');
  assert.equal(resolveLiquidGlassTheme('retired-theme', true), 'graphite');
  assert.equal(resolveLiquidGlassTheme(null), 'graphite');
});

// зачем (владелец 01.10): в 2.0 жёлтого нет — «золото» наград = акцент темы. Закон владельца 22.10: «верно/неверно» тоже из токенов текущей темы (good/bad), а не из базы.
const GOLD_KEYS = new Set(['gold', 'goldBg', 'textOnGold', 'correct', 'correctBg', 'wrong', 'wrongBg', 'correctText']);
const KEPT_KEYS = Object.keys(base).filter((key) => !GOLD_KEYS.has(key));
test('app mapping tints neutral roles, maps success/error to the theme good/bad, and maps gold to the theme accent', () => {
  for (const id of TINT_IDS) {
    const theme = makeLiquidGlassTheme(id, base);
    for (const key of KEPT_KEYS) assert.equal(theme[key], base[key], `${id}: ${key}`);
    assert.notEqual(theme.correct, base.correct, `${id}: correct не из базы`);
    assert.notEqual(theme.wrong, base.wrong, `${id}: wrong не из базы`);
    assert.equal(theme.correctBg, liquidGlassTokens(id).goodSoft, `${id}: correctBg = goodSoft`);
    assert.equal(theme.gold, liquidGlassTokens(id).accentBright, `${id}: gold = accentBright`);
    assert.equal(theme.textOnGold, liquidGlassTokens(id).accentInk, `${id}: textOnGold = accentInk`);
    assert.equal(theme.bgPrimary, liquidGlassTokens(id).bg);
    assert.equal(theme.accent, liquidGlassTokens(id).cta);
    assert.equal(theme.textPrimary, liquidGlassTokens(id).text);
  }
});

// ─── Темы 2.0: уровни цвета и светлое оформление (владелец 2026-09-30) ───────────
const {
  LIQUID_GLASS_COLOR_LEVELS,
  LIQUID_GLASS_APPEARANCES,
  getActiveLiquidGlassVariant,
  setActiveLiquidGlassVariant,
  resolveLiquidGlassAppearance,
  resolveLiquidGlassColorLevel,
} = require('../constants/liquidGlassThemePalette.ts');

const BASE_KEYS = ['bg', 'bgTop', 'bgBottom', 'opaqueCard', 'opaqueSheet', 'opaqueControl', 'card', 'sheet',
  'glassEdge', 'lightTint', 'cta', 'ctaInk', 'text', 'secondary', 'mutedText', 'line', 'selected'];
const ALL_VARIANTS = LIQUID_GLASS_APPEARANCES.flatMap(appearance => LIQUID_GLASS_COLOR_LEVELS.map(level => ({ level, appearance })));
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a.slice(0, 7)), luminance(b.slice(0, 7))].sort((x, y) => y - x);
  return (hi + .05) / (lo + .05);
};
const opacity = (hex) => hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1;
const isClear = (hex) => hex.length === 9 && hex.endsWith('00');

test('levels: calm + dark is the default and equals the approved thin theme', () => {
  assert.deepEqual(LIQUID_GLASS_COLOR_LEVELS, ['calm', 'accent', 'max']);
  assert.deepEqual(LIQUID_GLASS_APPEARANCES, ['dark', 'light']);
  assert.deepEqual(getActiveLiquidGlassVariant(), { level: 'calm', appearance: 'dark', intensity: 0 });
  assert.equal(resolveLiquidGlassColorLevel('bogus'), 'calm');
  assert.equal(resolveLiquidGlassColorLevel('max'), 'max');
  assert.equal(resolveLiquidGlassAppearance(null), 'dark');
  assert.equal(resolveLiquidGlassAppearance('light'), 'light');
  for (const id of TINT_IDS) {
    const calm = liquidGlassTokens(id, { level: 'calm', appearance: 'dark' });
    assert.equal(calm, liquidGlassTokens(id));
    // «Спокойно» — роли цвета повторяют нейтральные токены: ничего не перекрашивается.
    assert.equal(calm.accent, calm.cta);
    assert.equal(calm.accentInk, calm.ctaInk);
    assert.equal(calm.accentSoft, calm.selected);
    assert.equal(calm.accentCap, calm.cta);
    assert.ok(calm.bgGlow.every(isClear) && calm.cardSmoke.every(isClear), `${id}: calm has no glow/smoke`);
  }
});

test('accent: background and cards stay the calm ones, elements get a distinct theme colour', () => {
  const accents = new Set();
  for (const id of TINT_IDS) {
    const calm = liquidGlassTokens(id, { level: 'calm', appearance: 'dark' });
    const acc = liquidGlassTokens(id, { level: 'accent', appearance: 'dark' });
    for (const key of BASE_KEYS) assert.equal(acc[key], calm[key], `${id}: accent keeps ${key}`);
    assert.notEqual(acc.accent, calm.cta, `${id}: accent must colour the CTA`);
    assert.ok(contrast(acc.accent, acc.accentInk) >= 4.5, `${id}: accent CTA contrast`);
    assert.ok(acc.accentGradient.length >= 2 && acc.progressGradient.length >= 2);
    assert.ok(acc.bgGlow.every(isClear) && acc.cardSmoke.every(isClear), `${id}: accent has no glow/smoke`);
    accents.add(acc.accent);
  }
  assert.equal(accents.size, 13, 'every theme has its own accent');
});

test('max: glow and smoke appear, glass stays opaque (≥ 0.9) and dark', () => {
  for (const id of TINT_IDS) {
    const max = liquidGlassTokens(id, { level: 'max', appearance: 'dark' });
    assert.ok(max.bgGlow.some(c => !isClear(c)), `${id}: max background glow`);
    assert.ok(max.cardSmoke.some(c => !isClear(c)), `${id}: max card smoke`);
    assert.ok(opacity(max.card) >= .9 && opacity(max.sheet) >= .9, `${id}: opaque glass`);
    assert.ok(luminance(max.bg) < .035, `${id}: max background stays dark`);
    assert.ok(contrast(max.text, max.opaqueCard) >= 7, `${id}: max text contrast`);
  }
});

test('light: tinted light background, white cards, dark text, readable buttons for every level', () => {
  for (const id of TINT_IDS) {
    for (const level of LIQUID_GLASS_COLOR_LEVELS) {
      const t = liquidGlassTokens(id, { level, appearance: 'light' });
      assert.equal(t.isLight, true);
      assert.ok(luminance(t.bg) > .75, `${id}/${level}: light background`);
      assert.ok(luminance(t.opaqueCard) > .9, `${id}/${level}: white cards`);
      assert.ok(opacity(t.card) >= .9, `${id}/${level}: opaque card`);
      assert.ok(contrast(t.text, t.opaqueCard) >= 7, `${id}/${level}: text contrast`);
      assert.ok(contrast(t.secondary, t.opaqueCard) >= 4.5, `${id}/${level}: secondary contrast`);
      assert.ok(contrast(t.cta, t.ctaInk) >= 4.5, `${id}/${level}: neutral CTA contrast`);
      assert.ok(contrast(t.accent, t.accentInk) >= 4.5, `${id}/${level}: accent CTA contrast`);
      assert.equal(t.bgGlow.some(c => !isClear(c)), level === 'max', `${id}/${level}: glow only in max`);
    }
  }
});

test('every variant maps success and error to the theme, maps gold to the accent, and never mutates the calm cache', () => {
  for (const variant of ALL_VARIANTS) {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      const theme = makeLiquidGlassTheme(id, base, variant);
      for (const key of KEPT_KEYS) assert.equal(theme[key], base[key], `${id}/${variant.level}/${variant.appearance}: ${key}`);
      assert.equal(theme.gold, liquidGlassTokens(id, variant).accentBright);
      assert.equal(theme.accent, liquidGlassTokens(id, variant).accent);
    }
  }
  assert.equal(liquidGlassTokens('graphite').bg, '#0C0D10');
});

test('the active variant drives argument-less lookups (ThemeProvider registers it)', () => {
  try {
    setActiveLiquidGlassVariant({ level: 'accent', appearance: 'light' });
    assert.equal(liquidGlassTokens('marine'), liquidGlassTokens('marine', { level: 'accent', appearance: 'light' }));
    assert.equal(makeLiquidGlassTheme('marine', base).bgPrimary, liquidGlassTokens('marine', { level: 'accent', appearance: 'light' }).bg);
  } finally {
    setActiveLiquidGlassVariant({ level: 'calm', appearance: 'dark' });
  }
  assert.equal(liquidGlassTokens('graphite').bg, '#0C0D10');
});

test('a non-variant second argument (Array.map index) resolves to the active variant', () => {
  const [a, b] = ['graphite', 'marine'].map(liquidGlassTokens);
  assert.equal(a, liquidGlassTokens('graphite'));
  assert.equal(b, liquidGlassTokens('marine'));
  assert.equal(liquidGlassTokens('marine', { level: 'bogus', appearance: 'sepia' }), liquidGlassTokens('marine'));
});
