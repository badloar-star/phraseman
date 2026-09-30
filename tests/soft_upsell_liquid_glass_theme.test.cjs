const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../components/SoftContextualUpsellCard.tsx'), 'utf8');

test('live lesson-result Plus entry follows the selected glass tint', () => {
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /borderColor: glass\.glassEdge/);
  assert.match(source, /backgroundColor: glass.accent/);
  assert.match(source, /color: glass.accentInk/);
  assert.doesNotMatch(source, /color: t\.correctText/);
});

test('dismiss, impression and Plus navigation remain separate', () => {
  assert.match(source, /onLayout=\{handleLayout\}/);
  assert.match(source, /onDismiss\(\)/);
  assert.match(source, /onCta\(\)/);
  assert.match(source, /minHeight: 44/);
});
