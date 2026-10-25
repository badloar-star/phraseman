// зачем (PM-033, 01.10): «премиальность» не оправдывает серый нечитаемый текст (PM-033-A2).
// Считает WCAG-контраст ключевых пар для ВСЕХ 29 тем (13 тонированных + 10 градиентных + 6 премиум) × 3 уровня × 2 оформления (1566 проверок: 29 × 6 × 9).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  module._compile(out, filename);
};
const P = require(path.join(__dirname, '..', 'constants', 'liquidGlassThemePalette.ts'));

function parse(hex) {
  const h = String(hex).replace('#', '');
  const n = h.length === 3 || h.length === 4 ? h.split('').map((c) => c + c).join('') : h;
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16), a: n.length >= 8 ? parseInt(n.slice(6, 8), 16) / 255 : 1 };
}
function over(fg, bg) {
  const f = parse(fg); const b = typeof bg === 'string' ? parse(bg) : bg;
  return { r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 };
}
function lum(c) {
  const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}
function ratio(a, b) { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

const rows = [];
for (const id of P.LIQUID_GLASS_THEME_IDS) {
  for (const level of P.LIQUID_GLASS_COLOR_LEVELS) {
    for (const appearance of P.LIQUID_GLASS_APPEARANCES) {
      const g = P.liquidGlassTokens(id, { level, appearance });
      const bg = parse(g.bg);
      const card = over(g.opaqueCard, bg);
      const checks = [
        ['text/card', g.text, card, 4.5],
        ['secondary/card', g.secondary, card, 4.5],
        ['mutedText/card', g.mutedText, card, 4.5],
        ['secondary/bg', g.secondary, bg, 4.5],
        ['ctaInk/cta', g.ctaInk, over(g.cta, bg), 4.5],
      ];
      if (g.accent && g.accentInk) checks.push(['accentInk/accent', g.accentInk, over(g.accent, bg), 4.5]);
      if (g.accentText) checks.push(['accentText/bg', g.accentText, bg, 4.5], ['accentText/card', g.accentText, card, 4.5]);
      if (g.accentBright) checks.push(['accentBright(icon)/card', g.accentBright, card, 3]);
      for (const [name, fg, bgc, min] of checks) {
        const r = ratio(over(fg, bgc), bgc);
        rows.push({ id, level, appearance, name, r: +r.toFixed(2), min, ok: r >= min });
      }
    }
  }
}
test('Liquid Glass: text pairs meet WCAG contrast in every theme, level and appearance', () => {
  const fails = rows.filter((x) => !x.ok).map((x) => `${x.id}/${x.level}/${x.appearance} ${x.name}=${x.r} < ${x.min}`);
  // зачем (координатор 25.10): премиум-темы видимые (выбор тем, награды за достижения) — в реестре 23 + 6 = 29
  assert.equal(rows.length, 1566, 'матрица проверок изменилась — обнови ожидание осознанно');
  assert.deepEqual(fails, []);
});
