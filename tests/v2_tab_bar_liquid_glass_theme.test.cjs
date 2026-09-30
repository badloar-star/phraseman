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
  assert.match(source, /<BarRim\s+width=\{width\}\s+color=\{palette\.cta\}/);
  assert.match(source, /<CapFill\s+width=\{slotW\}\s+color=\{palette\.cta\}/);
  assert.match(source, /palette\.mutedText/);
  assert.doesNotMatch(source, /const\s+(?:COLOR|GLASS_FILL)\s*=/);
});

// зачем (владелец 29.09): таббар без подписей, крупные иконки по центру; название вкладки — только для скринридера.
test('tab bar is icon-only, enlarged, and keeps the screen-reader label', () => {
  assert.doesNotMatch(source, /<Text[\s>]/);
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
